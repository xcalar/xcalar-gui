import React from "react";
import SourceCSVArgSection from './SourceCSVArgSection';
import * as AdvOption from './AdvanceOption'
import InputDropdown from '../../../components/widgets/InputDropdown'
import * as SchemaService from '../../services/SchemaService';
import { FilePreview } from './FilePreview'
import { EditSchemaSection } from './EditSchema'

const Texts = {
    advancedOptions: 'Configuration',
};

class DiscoverSchemas extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const {
            parserType,
            fileSelectProps,
            fileContentProps,
            selectedSchema,
            editSchemaProps,
            inputSerialConfigProps,
            onParserTypeChange,
            selectedFileDir
        } = this.props;

        const needConfig = SchemaService.InputSerializationFactory.getFileType(inputSerialConfigProps.configWIP).has(SchemaService.FileType.CSV);
        const ParserType = SchemaService.FileType;

        const commonOptions = (
            <AdvOption.OptionGroup>
                <AdvOption.Option>
                    <AdvOption.OptionLabel>File Type</AdvOption.OptionLabel>
                    <AdvOption.OptionValue>
                        <InputDropdown
                            val={parserType}
                            onSelect={onParserTypeChange}
                            list={
                                [ParserType.CSV, ParserType.JSONL, ParserType.PARQUET].map((type, i) => {
                                    return {text: type, value: type};
                                })
                            }
                            readOnly
                        />
                    </AdvOption.OptionValue>
                </AdvOption.Option>
            </AdvOption.OptionGroup>
        );

        const csvOptions = needConfig && (
            <SourceCSVArgSection
                {...inputSerialConfigProps}
                classNames={['advOption-group-sub']}
            />
        );

        let filePreview = (<FilePreview
            fileSelectProps={fileSelectProps}
            fileContentProps={fileContentProps}
            parserType={parserType}
            selectedFileDir={selectedFileDir}
        />);

        const editSchema = selectedSchema != null && (
            <EditSchemaSection selectedSchema={selectedSchema} {...editSchemaProps} />
        );

        return (
            <React.Fragment>
                 <div className="configurationSection">
                    <AdvOption.Container>
                        <AdvOption.Title>{Texts.advancedOptions}</AdvOption.Title>
                        {commonOptions}
                        {csvOptions}
                    </AdvOption.Container>
                </div>
                {filePreview}
                {editSchema}
            </React.Fragment>
        );
    }
}

function AdvOptionCheckbox(props) {
    const { checked, onChange, children, classNames } = props;

    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    return (
        <AdvOption.Option classNames={classNames}>
            <AdvOption.OptionLabel onClick={() => {onChange(!checked)}}>{children}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <div className="csvArgs-chkbox">
                    <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked); }} />
                </div>
            </AdvOption.OptionValue>
        </AdvOption.Option>
    );
}

export default DiscoverSchemas;