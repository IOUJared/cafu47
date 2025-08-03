// functions/get-live-streams.js

// Helper function to get an App Access Token from Twitch
const getAppAccessToken = async (clientId, clientSecret) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to get Twitch token: ${response.statusText}`, errorBody);
        throw new Error(`Failed to get Twitch token`);
    }
    const data = await response.json();
    return data.access_token;
};

// This is the handler format for Cloudflare Functions
export async function onRequest(context) {
    try {
        // Access environment variables securely from the context
        const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = context.env;

        if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
            return new Response(JSON.stringify({ error: 'Twitch API credentials are not configured on the server.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get the channels to check from the request URL
        const url = new URL(context.request.url);
        const channels = url.searchParams.get('channels')?.split(',') || [];

        if (channels.length === 0) {
            return new Response(JSON.stringify({ error: 'No channels were provided to check.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const accessToken = await getAppAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

        const userLoginQuery = channels.map(c => `user_login=${encodeURIComponent(c)}`).join('&');
        const twitchApiUrl = `https://api.twitch.tv/helix/streams?${userLoginQuery}`;

        const twitchResponse = await fetch(twitchApiUrl, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!twitchResponse.ok) {
            throw new Error(`Twitch API request failed: ${twitchResponse.statusText}`);
        }

        const twitchData = await twitchResponse.json();

        // Format the data to send back to the client
        const liveStreams = twitchData.data.map(stream => ({
            channel: stream.user_login.toLowerCase(),
            label: stream.user_name,
        }));

        // Return a standard Response object
        return new Response(JSON.stringify(liveStreams), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in Cloudflare function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}