// functions/get-live-streams.js

const getAppAccessToken = async (clientId, clientSecret) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to get Twitch token: ${response.statusText}`);
    }
    return (await response.json()).access_token;
};

export async function onRequest(context) {
    const { env, request } = context;
    const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = env;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: 'API credentials are not configured.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = new URL(request.url);
    const mainChannel = url.searchParams.get('channel');
    const familyChannels = url.searchParams.get('family')?.split(',') || [];

    if (!mainChannel) {
        return new Response(JSON.stringify({ error: 'No channel provided.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const accessToken = await getAppAccessToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);
        const headers = {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
        };

        const allChannels = [mainChannel, ...familyChannels].filter(Boolean);
        const streamsQuery = allChannels.map(c => `user_login=${c}`).join('&');
        
        const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?${streamsQuery}`, { headers });
        if (!streamsResponse.ok) throw new Error('Failed to fetch stream data.');
        
        const streamsData = await streamsResponse.json();
        const liveUserLogins = streamsData.data.map(s => s.user_login.toLowerCase());

        const mainChannelLive = liveUserLogins.includes(mainChannel.toLowerCase());
        let liveFamilyMember = null;

        if (!mainChannelLive) {
            // Find the first live family member based on the original list order
            for (const member of familyChannels) {
                if (liveUserLogins.includes(member.toLowerCase())) {
                    liveFamilyMember = member;
                    break; 
                }
            }
        }

        // Fetch suggestions
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${mainChannel}`, { headers });
        let suggestions = [];
        if (userResponse.ok) {
            const userData = await userResponse.json();
            const broadcaster = userData.data[0];
            if (broadcaster) {
                const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster.id}`, { headers });
                let gameId = null;
                if (channelResponse.ok) {
                    const channelData = await channelResponse.json();
                    if (channelData.data && channelData.data.length > 0) {
                        gameId = channelData.data[0].game_id;
                    }
                }
                
                const lang = 'language=en';
                const suggestionUrl = gameId 
                    ? `https://api.twitch.tv/helix/streams?game_id=${gameId}&${lang}&first=6`
                    : `https://api.twitch.tv/helix/streams?${lang}&first=6`;
                
                const suggestionsResponse = await fetch(suggestionUrl, { headers });
                if (suggestionsResponse.ok) {
                    const suggestionsData = await suggestionsResponse.json();
                    suggestions = suggestionsData.data
                        .filter(s => s.user_login.toLowerCase() !== mainChannel.toLowerCase())
                        .slice(0, 5)
                        .map(s => ({ channel: s.user_login.toLowerCase(), label: s.user_name }));
                }
            }
        }

        return new Response(JSON.stringify({
            mainChannelLive,
            liveFamilyMember,
            suggestions
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in Cloudflare function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}
