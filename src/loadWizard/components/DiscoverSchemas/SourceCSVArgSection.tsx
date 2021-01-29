import * as React from "react";
import * as AdvOption from './AdvanceOption'
import InputDropdown from "../../../components/widgets/InputDropdown"
import { CSVHeaderOption, InputSerialization } from '../../services/SchemaService';

const csvHeaderOptions = [CSVHeaderOption.USE, CSVHeaderOption.IGNORE, CSVHeaderOption.NONE].map(
    (v) => ({text: v, value: v})
);

function getCSVInputsProps(config, errors = new Set()) {
    const {
        RecordDelimiter,
        FieldDelimiter,
        QuoteCharacter,
        QuoteEscapeCharacter
    } = config;

    return [{
        "text": "Record Delimiter",
        "keyword": "RecordDelimiter",
        "value": RecordDelimiter,
        "error": errors.has('RecordDelimiter'),
        "halfRow": true,
        "allowEmpty": false
    }, {
        "text": "Field Delimiter",
        "keyword": "FieldDelimiter",
        "value": FieldDelimiter,
        "error": errors.has('FieldDelimiter'),
        "halfRow": true,
        "allowEmpty": true
    }, {
        "text": "Quoting Character",
        "keyword": "QuoteCharacter",
        "value": QuoteCharacter,
        "error": errors.has('QuoteCharacter'),
        "halfRow": true,
        "allowEmpty": false
    }, {
        "text": "Quoting Escape Character",
        "keyword": "QuoteEscapeCharacter",
        "value": QuoteEscapeCharacter,
        "error": errors.has('QuoteEscapeCharacter'),
        "halfRow": true,
        "allowEmpty": false
    }];
}

function delimiterTranslate(val) {
    let delim = val;
    for (let i = 0; i < delim.length; i++) {
        if (delim[i] === '\"' && !xcHelper.isCharEscaped(delim, i)) {
            delim = delim.slice(0, i) + '\\' + delim.slice(i);
            i++;
        }
    }

    // hack to turn user's escaped string into its actual value
    let objStr = '{"val":"' + delim + '"}';
    try {
        delim = JSON.parse(objStr).val;
        return {
            delim,
            error: false
        };
    } catch (err) {
        return {
            delim, val,
            error: true
        };
    }
}

export default function SourceCSVArgSection(props: {
    configWIP: InputSerialization,
    errorFields: Set<string>,
    onConfigChange: (newConfig: InputSerialization, errorFields?: Set<string>) => void,
    classNames?: Array<string>
}) {
    // Properties & Computed values
    const { configWIP: config, errorFields, onConfigChange, classNames = [] } = props;
    const csvConfig = React.useMemo(() => config.CSV, [config.CSV]);
    const { FileHeaderInfo, AllowQuotedRecordDelimiter } = csvConfig;

    // Callback functions
    const onHeaderChange = React.useCallback((v) => {
        if (v === FileHeaderInfo) {
            return;
        }
        onConfigChange({CSV: {
            ...csvConfig,
            FileHeaderInfo: v
        }});
    }, [csvConfig, onConfigChange]);
    const onInputChange = (key, value, { isNumber = false, allowEmpty = false}) => {
            if (csvConfig[key] == null) {
                console.error('Key not found: ', key);
                return;
            }

            let argValue: string | number = '';
            let argError = false;
            if (value === "" && !allowEmpty) {
                // empty case
                argValue = "";
                argError = true;
            } else if (isNumber) {
                argValue = parseInt(value);
                argError = false;
            } else {
                const {delim, error} = delimiterTranslate(value);
                argValue = delim;
                argError = error;
            }

            const newCSVConfig = {...csvConfig};
            newCSVConfig[key] = argValue;
            const newErrorFields = new Set(errorFields);
            if (argError) {
                newErrorFields.add(key);
            } else {
                newErrorFields.delete(key);
            }

            onConfigChange({CSV: newCSVConfig}, newErrorFields);
    };
    const onAllowQuotedRecordDelimiterChange = React.useCallback((isSelected: boolean) => {
        onConfigChange({CSV: {
            ...csvConfig,
            AllowQuotedRecordDelimiter: isSelected
        }});
    }, [csvConfig, onConfigChange]);


    return (
        <AdvOption.OptionGroup classNames={classNames}>
            <CSVArgChoice
                label="Header Option"
                classNames={["fullRow"]}
                value={FileHeaderInfo}
                options={csvHeaderOptions}
                onChange={onHeaderChange}
            />
            {
                getCSVInputsProps(csvConfig, errorFields).map((arg) => {
                    const options = {
                        ...arg,
                        onChange: (k, v) => onInputChange(k, v, { allowEmpty: arg.allowEmpty })
                    }
                    return <CSVArgInput key={arg.keyword} {...options}></CSVArgInput>
                })
            }
            <CSVArgCheck
                label="Allow Quoted Record Delimiter"
                checked={AllowQuotedRecordDelimiter}
                classNames={["checkboxRow"]}
                onChange={onAllowQuotedRecordDelimiterChange}
            />
        </AdvOption.OptionGroup>
    )
}

/**
 *
 * @param {text, keyword, default, onChange} props
 */
function CSVArgInput(props) {
    const {text, keyword, value, onChange, error, isNumber, halfRow} = props;
    const strinfigyVal = (val) => {
        if (typeof val === "string") {
            val = val.replace(/\t/g, "\\t")
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r");
        } else {
            val = val + ""; // change number to string
        }
        return val;
    };
    const inputType = isNumber ? "number" : "text";
    const classNames = ["xc-input"];
    if (error) {
        classNames.push("error");
    }
    let outerClassNames = [];
    if (halfRow) {
        outerClassNames.push("halfRow");
    }

    const onValueChange = React.useCallback(
        e => onChange(keyword, e.target.value, isNumber),
        [onChange, keyword, isNumber]
    );
    const strValue = React.useMemo(() => strinfigyVal(value), [value]);

    return (
        <AdvOption.Option classNames={outerClassNames}>
            <AdvOption.OptionLabel>{text}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <input
                    className={classNames.join(" ")}
                    type={inputType}
                    defaultValue={strValue}
                    onChange={onValueChange}
                />
            </AdvOption.OptionValue>
        </AdvOption.Option>
    )
}

function CSVArgChoice(props) {
    const { label, value, options, onChange } = props;
    const [inputValue, setInputValue] = React.useState(value);

    return (
        <AdvOption.Option classNames={props.classNames}>
            <AdvOption.OptionLabel>{label}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <InputDropdown
                    val={inputValue}
                    onInputChange={(v) => {
                        if (v !== inputValue) {
                            setInputValue(v);
                            onChange(v);
                        }
                    }}
                    onSelect={(v) => {
                        if (v !== inputValue) {
                            setInputValue(v);
                            onChange(v);
                        }
                    }}
                    list={
                        options.map(({ text, value }) => {
                            return {text: text, value: value};
                        })
                    }
                    readOnly
                />
            </AdvOption.OptionValue>
        </AdvOption.Option>
    )
}

function CSVArgCheck(props) {
    const { label, checked, onChange, classNames } = props;
    const [ isChecked, setChecked ] = React.useState(checked);

    const iconClasses = ['icon', isChecked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    return (
        <AdvOption.Option classNames={classNames}>
            <AdvOption.OptionLabel onClick={() => {
                setChecked(!isChecked);
                onChange(!isChecked);
            }}>{label}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <div className="csvArgs-chkbox">
                    <i className={iconClasses.join(' ')}  onClick={() => {
                        setChecked(!isChecked);
                        onChange(!isChecked);
                    }} />
                </div>
            </AdvOption.OptionValue>
        </AdvOption.Option>
    );
}