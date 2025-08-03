// functions/get-live-streams.js

const getAppAccessToken = async (clientId, clientSecret) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to get Twitch token`);
    }
    const data = await response.json();
    return data.access_token;
};

export async function onRequest(context) {
    const { env, request } = context;
    const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = env;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: 'API credentials are not configured.' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = new URL(request.url);
    const mainChannel = url.searchParams.get('channel');
    const hostChannel = url.searchParams.get('host_channel');

    if (!mainChannel) {
        return new Response(JSON.stringify({ error: 'No channel provided.' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const accessToken = await getAppAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
        const headers = {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
        };

        // Check status of main and host channels
        const channelsToQuery = [mainChannel, hostChannel].filter(Boolean).join('&login=');
        const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?login=${channelsToQuery}`, { headers });
        if (!streamsResponse.ok) throw new Error('Failed to fetch stream data.');
        const streamsData = await streamsResponse.json();
        
        const liveStreams = streamsData.data.map(s => s.user_login.toLowerCase());

        const mainChannelLive = liveStreams.includes(mainChannel.toLowerCase());
        const hostChannelLive = hostChannel ? liveStreams.includes(hostChannel.toLowerCase()) : false;

        // Fetch user data for the main channel to get game_id
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${mainChannel}`, { headers });
        if (!userResponse.ok) throw new Error('Failed to fetch user data.');
        const userData = await userResponse.json();
        const broadcaster = userData.data[0];

        let suggestions = [];
        if (broadcaster) {
            const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster.id}`, { headers });
            let gameId = null;
            if (channelResponse.ok) {
                const channelData = await channelResponse.json();
                // **FIX:** Check if channel data and game_id exist before using them.
                if (channelData.data && channelData.data.length > 0) {
                    gameId = channelData.data[0].game_id;
                }
            }

            const languageFilter = 'language=en';
            let suggestedStreamsData;
            let suggestionUrl = `https://api.twitch.tv/helix/streams?${languageFilter}&first=6`;

            if (gameId) {
                suggestionUrl = `https://api.twitch.tv/helix/streams?game_id=${gameId}&${languageFilter}&first=6`;
            }
            
            const suggestedStreamsResponse = await fetch(suggestionUrl, { headers });
            if (suggestedStreamsResponse.ok) {
                suggestedStreamsData = await suggestedStreamsResponse.json();
                suggestions = suggestedStreamsData.data
                    .filter(stream => stream.user_login.toLowerCase() !== mainChannel.toLowerCase())
                    .slice(0, 5)
                    .map(stream => ({
                        channel: stream.user_login.toLowerCase(),
                        label: stream.user_name,
                    }));
            }
        }
        
        return new Response(JSON.stringify({
            mainChannelLive,
            hostChannelLive,
            suggestions
        }), {
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
