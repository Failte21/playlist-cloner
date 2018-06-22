const axios = require('axios')
const urlencode = require('urlencode')
const _get = require('lodash/get')
const playlist_info = require('./playlist_info')
require('dotenv').config()

const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN;
const spotifyUrl = "https://api.spotify.com/v1/users/failte-fr/playlists"
const spotifyTokenUrl = "https://accounts.spotify.com/api/token"

const header = {
    headers: {
        Authorization: `Bearer ${SPOTIFY_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json"
    }
}

function retrieveSpotifyIds(tracks = []) {
    return new Promise((resolve, reject) => {
        const promises = tracks.map(({artist, title}) => {
            const query = urlencode(`${artist} ${title}`)
            const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=FR`
            return axios.get(url, header)
        })
        Promise.all(promises)
            .then(res => {
                const trackIds = 
                    res.map(r => _get(r, 'data.tracks.items[0].id'))
                    .filter(id => !!id)
                resolve(trackIds)
            })
            .catch(err => reject(err.message))
    })
}

function addTracksToPlaylist(spotifyPlaylistId, deezerPlaylistId) {
    axios.get(`https://api.deezer.com/playlist/${deezerPlaylistId}`)
        .then(res => {
            const tracks = res.data.tracks.data.map(t => {
                const { artist, title } = t
                return {artist: artist.name, title}
            })
            retrieveSpotifyIds(tracks)
                .then(trackIds => {
                    const trackList = trackIds.reduce((list, id) => {
                        const formatted = `spotify:track:${id}`
                        return !!list ? `${list},${formatted}` : formatted
                    }, null)
                    const url = `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USERNAME}/playlists/${spotifyPlaylistId}/tracks?uris=${urlencode(trackList)}`
                    axios.post(url, {}, header)
                        .then(res => {
                            const freshPlaylistUrl = `https://open.spotify.com/user/${process.env.SPOTIFY_USERNAME}/playlist/${spotifyPlaylistId}`;
                            console.log(`Your playlist has been successfully created ! enjoy at ${freshPlaylistUrl}`);
                        })
                        .catch(handleError)
                })
                .catch(handleError)
        })
        .catch(err => console.log("an error occured"))
}

if (!!playlist_info.deezer_playlist_id && !!playlist_info.playlist_name) {

    const body = {
        "name": playlist_info.playlist_name,
        "public": false
    }

    axios.post(spotifyUrl, body, header) //Empty playlist creation
    .then(res => {
        addTracksToPlaylist(res.data.id, playlist_info.deezer_playlist_id)
    })
    .catch(handleError)
} else {
    console.log ('Missing informations in playlist_info.json')
}

function handleError(err) {
    console.log(`an error occurred: ${err.message}`);
}