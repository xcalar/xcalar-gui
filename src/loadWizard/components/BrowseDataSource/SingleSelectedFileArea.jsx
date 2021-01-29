import React from 'react';
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';

const Texts = {
    selectListTitleFile: 'Selected File',
    selectListTitleFolder: 'Selected Folder'
};

function validateRegex(regex) {
    return regex != null &&
        regex.length > 0 &&
        RegExp('^re:.+').test(regex);
}

function validateGlob(glob) {
    return glob != null && glob.length > 0;
}

export default function SelectedFileArea(props) {
    const {
        bucket,
        selectedFileDir,
        fileNamePattern,
        onPatternChange,
    } = props;

    const selected = selectedFileDir[0];
    const createSelectedSection = () => {
        if (selected == null) {
            return null;
        }

        if (selected.directory) {
            const inputClassNames = ['xc-input'];
            if (!validateGlob(fileNamePattern)) {
                inputClassNames.push('error-input');
            }

            return (<React.Fragment>
                <Folder style={{fontSize: 20, position: "relative", top: 2}}/>
                <span>{selected.fullPath}</span>
                <span><input spellCheck={false} className={inputClassNames.join(' ')} type="text" value={fileNamePattern} onChange={(e) => {
                    onPatternChange(e.target.value.trim());
                }} /></span>
            </React.Fragment>);
        } else {
            return (<React.Fragment>
                <InsertDriveFileOutlined style={{fontSize: 20, position: "relative", top: 2}}/>
                <span>{selected.fullPath}</span>
           </React.Fragment>)
        }
    }

    return (
        <div className="selectedFilesArea">
            <div className="heading">{selected.directory ? Texts.selectListTitleFolder : Texts.selectListTitleFile}</div>
            <div className="selectedFile">
                {createSelectedSection()}
            </div>
        </div>
    )
}