A travel guide app that gives the user information about nearby points of interest as they walk through a city.

It should have a map (use expo map, for both IOS and Android, https://docs.expo.dev/versions/latest/sdk/maps/), a start button, and a toggle in the top right to switch between map view and AI response view.

Importantly, the user doesn't type any text to prompt the AI, only the geographic data is sent to the backend.

Initially, focus only on the graphic interface.

Send off GPS position to the backend (make this work for both IOS and Andriod).
Get interesting locations in return.
When we are close to the interesting locations, we ask an LLM for guide info (make it LLM agnostic, i.e. that we can easily switch out the LLM / polymorphism).
When the LLM is finished, it returns with text.