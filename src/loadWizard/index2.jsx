import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import './export'
import LoadResultsPage from './components/LoadResults/LoadResultsPage';

ReactDOM.render(<App />, document.getElementById('loadWizard'));

ReactDOM.render(<LoadResultsPage />, document.getElementById("loadHistory"))