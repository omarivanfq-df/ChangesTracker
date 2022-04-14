/* eslint-disable no-mixed-operators */
/* eslint-disable no-magic-numbers */
/* eslint-disable no-bitwise */
const _ = require('lodash');

const FIELD_TYPES = {
    TEXT: 'Text',
    NUMERIC: 'Numeric',
    TRUE_FALSE: 'True/False',
    DATE: 'Date',
    LINK: 'Link'
};

const DEFAULT_VALUES = {
    [FIELD_TYPES.TEXT]: '',
    [FIELD_TYPES.NUMERIC]: 0,
    [FIELD_TYPES.TRUE_FALSE]: false,
    [FIELD_TYPES.DATE]: null,
    [FIELD_TYPES.LINK]: null
};

const ERASED_COMPARE = {
    FIX: 1,
    IGNORE: 2,
    NONE: 3
};

const DEFAULT_CONFIG = {
    erasedCompare: ERASED_COMPARE.FIX,
    trimToCompare: false
};

/*
    erasedCompare:
    when a record property changes from any defined value to an undefined value
        (e.g. when record.status goes from 'Rejected' to undefined)
    that property keeps its initial value after saving it
        (e.g. record.status would keep the 'Rejected' value even after saving it)
    this could trigger an infinite update cycle in Blitz since the OnRecordUpdated
    handler would be executed again and the same change ('Rejected' vs. undefined)
    would be detected each time
    FIX:
    this configuration traces those 'erased' properties and change them to a
    default value that can be properly saved
        (e.g. we would change record.status to "")
    IGNORE:
    when this configuration is set to true the algorithm that compares the
    properties simply ignores the change (but the record will still keep the
    previous value after saving)
        (e.g. record.status would keep its undefined value but would then return
        to 'Rejected' after saving the record)
*/

class ChangesTracker {

    constructor(context, record, config = {}) {
        this.record = record;
        this.fields = GetFields(context.Blitz, record);
        this.trackedFields = this.GetDefaultTrackedFields(this.fields);
        this.recordBeforeChanges = this.GetRecordCopy(record);
        this.config = this.GetConfig(config);
        this.defaultValues = { ...DEFAULT_VALUES };
        this.log = context.log || null;
        this.isLogActive = context.log && context.isLogActive || false;
    }

    GetDefaultTrackedFields(fields) {
        // by default we track changes for all the record fields
        return Object.keys(fields);
    }

    GetRecordCopy(record) {
        const recordCopy = _.cloneDeep(record);
        return Object.freeze(recordCopy);
    }

    GetConfig(customConfig) {
        return { ...DEFAULT_CONFIG, ...customConfig };
    }

    ChangesWereMade() {
        let changesWereMade = false;
        this.trackedFields.forEach(fieldId => {
            changesWereMade |= !this.CompareField(fieldId);
        });
        return Boolean(changesWereMade);
    }

    CompareField(fieldId) {
        // eslint-disable-next-line prefer-const
        let { previousValue, currentValue } = this.GetFieldValue(fieldId);
        if (this.ValueWasErased(previousValue, currentValue)) {
            const fixedCurrent = this.FixErased(fieldId, previousValue, currentValue);
            currentValue = fixedCurrent;
        }
        const type = this.GetFieldType(fieldId);
        const areEqual = this.CompareFieldsAccordingToType(previousValue, currentValue, type);
        if (this.isLogActive && !areEqual) {
            this.log('notice', `### ${fieldId} field changed: ${type}(${JSON.stringify(previousValue)}, ${JSON.stringify(currentValue)})`);
        }
        return areEqual;
    }

    GetFieldType(fieldId) {
        return this.fields[fieldId].Type;
    }

    CompareFieldsAccordingToType(previousValue, currentValue, type) {
        switch (type) {
            case FIELD_TYPES.TRUE_FALSE:
                return previousValue === currentValue;
            case FIELD_TYPES.TEXT:
                return CompareStrings(previousValue, currentValue, this.config);
            case FIELD_TYPES.NUMERIC:
                return CompareNumerics(previousValue, currentValue);
            case FIELD_TYPES.DATE:
                return CompareDates(previousValue, currentValue);
            case FIELD_TYPES.LINK:
                return CompareLinks(previousValue, currentValue);
            default:
                return true;
        }
    }

    GetFieldValue(fieldId) {
        const currentValue = this.record[fieldId];
        const previousValue = this.recordBeforeChanges[fieldId];
        return { currentValue, previousValue };
    }

    ValueWasErased(previous, current) {
        return previous !== undefined && current === undefined;
    }

    FixErased(fieldId, previous, current) {
        const type = this.GetFieldType(fieldId);
        let newCurrent = current;
        switch (this.config.erasedCompare) {
            case ERASED_COMPARE.FIX:
                this.record[fieldId] = this.defaultValues[type];
                newCurrent = this.record[fieldId];
                if (this.isLogActive && previous !== newCurrent) {
                    this.log('notice', `### Field ${fieldId} was fixed: ${type}(undefined, ${JSON.stringify(newCurrent)})`);
                }
                break;
            case ERASED_COMPARE.IGNORE:
                newCurrent = previous;
        }
        return newCurrent;
    }

    ClearTrackedFields() {
        this.trackedFields = [];
    }

    AddTrackedFields(fieldsId) {
        const validFieldIds = fieldsId.filter(id => this.fields[id] && !this.trackedFields.includes(id));
        this.trackedFields.push(...validFieldIds);
    }

    RemoveTrackedFields(fieldsId) {
        this.trackedFields = this.trackedFields
            .filter(fieldId => !fieldsId.includes(fieldId));
    }

    SetDefaultValue(fieldType, defaultValue) {
        if (Object.values(FIELD_TYPES).includes(fieldType)) {
            this.defaultValues[fieldType] = defaultValue;
        }
    }

}

function GetFields(Blitz, record) {
    const fieldsArray = Blitz.Catalogs[record.schemaId]._schema.Fields;
    return TransformToObject(fieldsArray);
}

function TransformToObject(fieldsArray) {
    const fields = {};
    fieldsArray.forEach(field => {
        fields[field.FieldId] = field;
    });
    return fields;
}

function CompareStrings(previous, current, options) {
    const { trimToCompare } = options;

    if (trimToCompare) {
        return TrimIfString(previous) === TrimIfString(current);
    }

    return previous === current;

    function TrimIfString(value) {
        return typeof value === 'string' ? value.trim() : value;
    }
}

function CompareNumerics(previous, current) {
    if (isNaN(previous) && isNaN(current)) {
        return true;
    }
    return previous === current;
}

function CompareDates(date1, date2) {
    if (IsValidDate(date1) && !IsValidDate(date2)) {
        return false;
    }
    if (!IsValidDate(date1) && IsValidDate(date2)) {
        return false;
    }
    if (!IsValidDate(date1) && !IsValidDate(date2)) {
        return date1 === date2;
    }
    return date1.getTime() === date2.getTime();
}

function CompareLinks(previousValue, currentValue) {
    previousValue = FixLink(previousValue);
    currentValue = FixLink(currentValue);

    if (previousValue.length === currentValue.length) {
        return currentValue.every(({ _id }, i) => _id === previousValue[i]._id);
    }

    return false;

    function FixLink(link) {
        return RemoveInvalidRecords(GetLinkAsArray(link));
    }

    function GetLinkAsArray(link) {
        if (Array.isArray(link)) {
            return link;
        } else if (typeof link === 'object' && link !== null) {
            return [link];
        }
        return [];
    }

    function RemoveInvalidRecords(link) {
        link = OnlyObjects(link);
        link.sort(LinkSortCompare);
        const validRecords = [];
        const visited = [];
        for (const record of link) {
            if (record._id && !visited.includes(record._id)) {
                validRecords.push(record);
                visited.push(record._id);
            }
        }
        return validRecords;
    }

    function OnlyObjects(array) {
        return array.filter(item => item && !Array.isArray(item) && typeof item === 'object');
    }

    function LinkSortCompare(link1, link2) {
        if (link1._id < link2._id) {
            return -1;
        }
        if (link1._id > link2._id) {
            return 1;
        }
        return 0;
    }
}

function IsValidDate(date) {
    return !IsNullOrUndefined(date) && typeof date.getMonth === 'function';
}

function IsNullOrUndefined(value) {
    return value === null || value === undefined;
}

ChangesTracker.DEFAULT_VALUES = DEFAULT_VALUES;
ChangesTracker.FIELD_TYPES = FIELD_TYPES;
ChangesTracker.ERASED_COMPARE = ERASED_COMPARE;

module.exports = ChangesTracker;
