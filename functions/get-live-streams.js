// functions/get-live-streams.js

// Helper function to get a secure App Access Token from Twitch
const getAppAccessToken = async (clientId, clientSecret) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to get Twitch token`);
    }
    const data = await response.json();
    return data.access_token;
};

// Main handler for the Cloudflare Function
export async function onRequest(context) {
    const { env, request } = context;
    const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = env;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: 'API credentials are not configured.' }), { status: 500 });
    }

    const url = new URL(request.url);
    const mainChannelLogin = url.searchParams.get('channel');

    if (!mainChannelLogin) {
        return new Response(JSON.stringify({ error: 'No channel provided.' }), { status: 400 });
    }

    try {
        const accessToken = await getAppAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
        const headers = {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
        };

        // Step 1: Get the User ID for the provided channel login
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${mainChannelLogin}`, { headers });
        if (!userResponse.ok) throw new Error('Failed to fetch user data.');
        const userData = await userResponse.json();
        const broadcasterId = userData.data[0]?.id;

        if (!broadcasterId) {
            throw new Error('User not found.');
        }

        // Step 2: Get the last category/game the channel was playing
        const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, { headers });
        if (!channelResponse.ok) throw new Error('Failed to fetch channel data.');
        const channelData = await channelResponse.json();
        const gameId = channelData.data[0]?.game_id;

        let streamsData;

        // Step 3: Fetch top streams, either by game or overall top streams as a fallback
        if (gameId) {
            // Fetch top 5 streams in the same game, excluding the original channel
            const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?game_id=${gameId}&first=6`, { headers });
            if (!streamsResponse.ok) throw new Error('Failed to fetch streams by game.');
            streamsData = await streamsResponse.json();
        } else {
            // Fallback: If no game was being played, get the overall top 5 streams
            const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?first=6`, { headers });
            if (!streamsResponse.ok) throw new Error('Failed to fetch top streams.');
            streamsData = await streamsResponse.json();
        }
        
        // Format the results, filtering out the original offline channel and limiting to 5
        const liveStreams = streamsData.data
            .filter(stream => stream.user_login.toLowerCase() !== mainChannelLogin.toLowerCase())
            .slice(0, 5)
            .map(stream => ({
                channel: stream.user_login.toLowerCase(),
                label: stream.user_name,
            }));

        return new Response(JSON.stringify(liveStreams), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in Cloudflare function:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}