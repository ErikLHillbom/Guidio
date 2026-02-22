A travel guide app that gives the user information about nearby points of interest as they walk through a city.

It should have a map (use react-native-maps, for both IOS and Android, https://www.npmjs.com/package/react-native-maps).

Importantly, the user doesn't type any text to prompt the AI, only the geographic data is sent to the backend.

Send off GPS position to the backend (make this work for both IOS and Andriod).
Get interesting locations in return (name, long/lat position). Cache these.
When we are close to the interesting locations (compare GPS to long/lat of point of interests), we ask the backend for information.
When the backend is finished, it returns with audio, audio transcription, and an image URL.

Use REST calls for interfacing with the backend.

The user flow is: Open app --> Display map --> Press "Start guide" button --> Show AI guide respone (just as text for now)

Mark visited suggestions as "visited" so that we don't request info on it many times.

Have different admissable distances based on category.

When you come closer than 300m to an object, you get the detailed information.
You can also get the detailed information by clicking on the context window of a pin.

Add the image URL:s to the pins.

"Use the image URL:s to render images in the pin context windows instead of the current placeholders."

Use bucketing to increase performance.
- Divide the entire world into 2 km square buckets (poles can be a buffer zone)
- Load the points of interest from the json files into cache in the current and adjacent buckets
- In debug mode, show these gridlines on the map
- Discard the POI:s from the cache when they are outside the current and adjacent buckets.

Do a general refactoring of the entire codebase.
Plan a refactoring of the codebase:
- Ensure separation of concerns (encapsulation)
- Make sure the endpoints for GPS position to the backend, nearby POI:s, and audio/transcription/image data for pins are clearly defined and separated, and that they process debug and real data the same way.
- Make a clear separation between debug and production mode.
- Remove unused code and packages

Make sure the "click for detailed description" works.

Revert to the old functionality of "one POI at a time, sequentially".
- When the user approaches many POI:s at once, prioritize the closest one
- Add other ones to a queue, and when every new pins enters the queue it is ordered by current distance to the user
- Check the duration of the audio that the backend returns, show the duration by having the "start" button "fill up" from light blue to dark blue, as the image shows. Also, have the transcription show in the "guide responses" in the pulldown menu at the top.

Can I get some mock audio too?

When you press on the context window for a pin, a detailed view should open. Have this detailed view either be a placeholder, or a detailed description from the backend.

When you come so close to a pin that it is "nearby" (turns green), you should play the audio corresponding to this pin. This audio will come at the same time as the transcription. In the request to the backend, we put the ID of the relevant pin. For mocking, use

Use expo-audio instead of expo-av

Have local urls/paths for the audio/transcription for the pins. This is how they are "stored" in the backend.

Take a good look at the entire codebase, and plan optimization improvements.

It seems like the removal of duplicates in the backend needs to be done many times. Can't we do it permanently somehow? Like, save the result?

How to make it agentic:
- Answer questions. "What happens here?" --> News database, other sources, automatic booking, et.c.

When the user has wandered a significant distance from a landmark (>100m in addition to the minimum radius), the AI should now to end its explanation. Based on silent periods in the voiceover, find good times to pause. Play a "ping" sound when the user loses connection with a point of interest.