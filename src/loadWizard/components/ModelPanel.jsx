import React from "react";

const Texts = {
    importModels: 'Schema Model',
    newModel: 'Add',
}

function ModelRow({ name, isSelected, onClick }) {
    const className = ['grid-unit', 'modelElement'].concat(isSelected ? ['active'] : []).join(' ');
    return (
        <div className={className} onClick={() => { onClick(name); }}>
            <span className="icon">❖</span>
            <span className="modelName">{name}</span>
        </div>
    );
}

export default function ModelPanel({
    onSelectModel,
    models,
    modelSelected
}) {
    return (
        <div className="modelPanel">
            <div className="modelPanelContent">
            <div className="header">{Texts.importModels}</div>
                <button
                    className="addModel btn btn-secondary btn-new"
                    onClick={() => { onSelectModel();} }>
                        <i className="icon xi-plus fa-11"></i>
                    <span>{Texts.newModel}</span>
                </button>
                <div className="modelList xc-grid listView">
                    {models.map(({ name: modelName }) => (
                        <ModelRow key={modelName} name={modelName} isSelected={modelSelected === modelName} onClick={onSelectModel} />
                    ))}
                </div>
            </div>
        </div>
    );
}