A travel guide app that gives the user information about nearby points of interest as they walk through a city.

It should have a map (use react-native-maps, for both IOS and Android, https://www.npmjs.com/package/react-native-maps).

Importantly, the user doesn't type any text to prompt the AI, only the geographic data is sent to the backend.

Send off GPS position to the backend (make this work for both IOS and Andriod).
Get interesting locations in return (name, long/lat position). Cache these.
When we are close to the interesting locations (compare GPS to long/lat of point of interests), we ask the backend for information.
When the backend is finished, it returns with audio, audio transcription, and an image URL.

Use REST calls for interfacing with the backend.

The user flow is: Open app --> Display map --> Press "Start guide" button --> Show AI guide respone (just as text for now)

Mark visited suggestions as "visited" (not visually, just in persistent phone memory) so that we don't request info on it many times.

