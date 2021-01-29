import React from "react";
import * as AdvOption from './AdvanceOption'

class OptionSampleSize extends React.PureComponent {
    /**
     * Constructor
     * @param {{ sampleSize: number, onChange: (size: number)=>void, children?: Object, classNames?: Array<string> }} props
     */
    constructor(props) {
        super(props);

        const { sampleSize } = props;
        this.state = {
            hasError: false,
            inputValue: `${sampleSize}`,
            checked: sampleSize === -1
        };
    }

    _inputChange(strVal) {
        const { onChange } = this.props;
        this.setState({
            inputValue: strVal,
            hasError: false,
            checked: false
        });

        const value = Number(strVal);
        if (strVal.trim().length === 0 || value <= 0) {
            this.setState({
                hasError: true,
            });
        } else {
            onChange(value);
        }
    }

    _checkboxChange(checked) {
        const defaultValue = 10;
        const newSize = checked ? -1 : defaultValue;

        this.setState({
            checked: checked,
            hasError: false,
            inputValue: `${defaultValue}`
        });

        const { onChange } = this.props;
        onChange(newSize);
    }

    render() {
        const { children, classNames = [] } = this.props;
        const { hasError, inputValue, checked } = this.state;

        const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
        const inputClassNames = ["xc-input"];
        if (hasError) {
            inputClassNames.push('error');
        }


        return (
            <AdvOption.Option classNames={classNames}>
                <AdvOption.OptionLabel>{children}</AdvOption.OptionLabel>
                <AdvOption.OptionValue classNames={['option-sampleSize-value']}>
                    <div style={{paddingRight: '8px'}} className="csvArgs-chkbox">
                        <i className={iconClasses.join(' ')}  onClick={() => { this._checkboxChange(!checked) }} />
                        <span style={{paddingLeft: '4px'}} onClick={() => { this._checkboxChange(!checked); }}>All Lines</span>
                    </div>
                    { checked ? null : <input
                            className={inputClassNames.join(' ')}
                            type="number"
                            value={inputValue}
                            onChange={ (e) => { this._inputChange(e.target.value) }}
                        />}
                </AdvOption.OptionValue>
            </AdvOption.Option>
        );
    }
}

export { OptionSampleSize };