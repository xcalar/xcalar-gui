To run a test:

One time setup to install nightwatch -> From xcalar-gui directory: go into assets/dev/e2eTest, do: npm install

To run an existing test such as the test located in assets/test/e2eTest/dataflowReplayTest2.js,  navigate to assets/dev/e2eTest in your terminal and execute this command: npm test -- --tag "dataflowTest2". Or if you want to run the test and watch it in the browser, use: npm run debug -- --tag "dataflowTest2"