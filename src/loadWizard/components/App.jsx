import React from 'react';
import '../styles/App.less';
import ModelPanel from './ModelPanel'
import { LoadConfig, stepEnum } from './LoadConfig';

import * as SchemaLoadService from '../services/SchemaLoadService';
import * as S3Service from '../services/S3Service';
import * as SchemaLoadSetting from '../services/SchemaLoadSetting';
import * as SchemaService from '../services/SchemaService';
const LoadServices = {};
window["LoadServices"] = LoadServices;

LoadServices["SchemaLoadService"] = SchemaLoadService;
LoadServices["S3Service"] = S3Service;
LoadServices["SchemaLoadSetting"] = SchemaLoadSetting;
LoadServices["SchemaService"] = SchemaService;

/**
 * Component
 */
class App extends React.Component {
    constructor(props) {
        super(props);
        // Inintial state
        this.state = {
            models: [this._getDefaultModel()],
            currentModelName: 'untitled',
            showModelPanel: true
        };
    }

    async componentDidMount() {
        const loadedModels = await this._fetchModels();
        const existingModelNames = new Set();
        for (const { name } of this.state.models) {
            existingModelNames.add(name);
        }

        const newModels = new Array();
        for (const model of loadedModels) {
            if (!existingModelNames.has(model.name)) {
                newModels.push(model);
            }
        }

        if (newModels.length > 0) {
            this.setState({
                models: [...models.map((v) => ({...v})), ...newModels.map((v) => ({...v}))]
            });
        }
    }

    _getDefaultModel() {
        return {
            name: 'untitled', bucket: '/', path: '',
            FileNameRule: '*'
        };
    }

    async _fetchModels() {
        // XXX TODO: Load models from kvstore/somewhere
        const models = new Array()
        // models.push({
        //     name: 'mdmdemo', bucket: '/xcfield/', path: 'instantdatamart/mdmdemo/',
        //     FileNameRule: '*'
        // });
        // models.push({
        //     name: 'multi_schemas', bucket: '/xcfield/', path: 'instantdatamart/csv/',
        //     FileNameRule : "*.csv"
        // });
        // models.push({
        //     name: 'xcfield', bucket: '/xcfield/', path: '',
        //     FileNameRule : "*.csv"
        // });

        return models;
    }

    _selectModel(modelName) {
        let selectedModel = this.state.models[0];
        for (const model of this.state.models) {
            if (model.name === modelName) {
                selectedModel = model;
                break;
            }
        }

        this.setState({
            currentModelName: selectedModel.name
        });
    }

    _toggleModelPanel(step) {
        this.setState({
            showModelPanel: step === stepEnum.SourceData
        });
    }

    render() {
        // const showModelPanel = this.state.showModelPanel;
        const showModelPanel = false;
        return (
            <div className="App">
                {
                    showModelPanel
                        ? <ModelPanel
                            models={this.state.models.map((v) => v)}
                            modelSelected={this.state.currentModelName}
                            onSelectModel={(name) => { this._selectModel(name); }} />
                        : null
                }
                <div className={"mainArea " + (showModelPanel ? "panelShown" : "")}>
                    <LoadConfig
                        onStepChange={ (step) => { this._toggleModelPanel(step); }}
                    />
                </div>
            </div>
        );
    }

}

export default App;
