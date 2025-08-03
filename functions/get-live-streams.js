// functions/get-live-streams.js

const getAppAccessToken = async (clientId, clientSecret) => {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to get Twitch token: ${response.statusText}`);
    }
    const json = await response.json();
    return json.access_token;
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
    const familyChannels = url.searchParams.get('family')?.split(',').filter(Boolean) || [];

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

        // Check if main channel and family channels are live
        const allChannels = [mainChannel, ...familyChannels];
        const streamsQuery = allChannels.map(c => `user_login=${c.trim()}`).join('&');
        
        const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?${streamsQuery}`, { headers });
        if (!streamsResponse.ok) {
            const errorText = await streamsResponse.text();
            throw new Error(`Failed to fetch stream data from Twitch: ${streamsResponse.status} ${errorText}`);
        }
        
        const streamsData = await streamsResponse.json();
        const liveStreams = streamsData.data || [];
        
        // Create a map of live channels
        const liveChannelsMap = new Map();
        liveStreams.forEach(stream => {
            liveChannelsMap.set(stream.user_login.toLowerCase(), {
                channel: stream.user_login.toLowerCase(),
                displayName: stream.user_name,
                gameId: stream.game_id
            });
        });

        const mainChannelLive = liveChannelsMap.has(mainChannel.toLowerCase());
        let liveFamilyMember = null;

        // If main channel is offline, check for live family members
        if (!mainChannelLive && familyChannels.length > 0) {
            for (const member of familyChannels) {
                if (liveChannelsMap.has(member.toLowerCase())) {
                    const liveStream = liveChannelsMap.get(member.toLowerCase());
                    liveFamilyMember = {
                        channel: liveStream.channel,
                        displayName: liveStream.displayName
                    };
                    break;
                }
            }
        }

        // Get suggestions for related live channels
        let suggestions = [];
        
        // Get the main channel's info to find related streams
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${mainChannel}`, { headers });
        if (userResponse.ok) {
            const userData = await userResponse.json();
            const broadcaster = userData.data[0];
            if (broadcaster) {
                // Get the main channel's current/last game
                const channelResponse = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster.id}`, { headers });
                let gameId = null;
                if (channelResponse.ok) {
                    const channelData = await channelResponse.json();
                    if (channelData.data && channelData.data.length > 0) {
                        gameId = channelData.data[0].game_id;
                    }
                }
                
                // Get suggestions based on the game or just top English streams
                const lang = 'language=en';
                const suggestionUrl = gameId 
                    ? `https://api.twitch.tv/helix/streams?game_id=${gameId}&${lang}&first=8`
                    : `https://api.twitch.tv/helix/streams?${lang}&first=8`;
                
                const suggestionsResponse = await fetch(suggestionUrl, { headers });
                if (suggestionsResponse.ok) {
                    const suggestionsData = await suggestionsResponse.json();
                    suggestions = suggestionsData.data
                        .filter(s => {
                            const channelName = s.user_login.toLowerCase();
                            // Filter out main channel and family channels
                            return channelName !== mainChannel.toLowerCase() && 
                                   !familyChannels.some(fam => fam.toLowerCase() === channelName);
                        })
                        .slice(0, 5)
                        .map(s => ({ 
                            channel: s.user_login.toLowerCase(), 
                            label: s.user_name 
                        }));
                }
            }
        }

        return new Response(JSON.stringify({
            mainChannelLive,
            liveFamilyMember,
            suggestions
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
        });

    } catch (error) {
        console.error('Error in Cloudflare function:', error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}