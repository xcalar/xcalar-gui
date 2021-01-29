import reducer from "./reducers";
import { createStore, applyMiddleware } from "redux";
import thunk from 'redux-thunk';

const middleware = [ thunk ];

const store = createStore(
    reducer,
    applyMiddleware(...middleware)
);

export default store;
