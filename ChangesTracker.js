const FIELD_TYPES = {
    TEXT: 'Text',
    NUMERIC: 'Numeric',
    TRUE_FALSE: 'True/False',
    DATE: 'Date',
    LINK: 'Link'
}

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
    erasedCompare: ERASED_COMPARE.FIX
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
        this.defaultValues = Object.assign({}, DEFAULT_VALUES);
        this.log = context.log || null;
        this.isLogActive = context.log && context.isLogActive || false;
    }

    GetDefaultTrackedFields(fields) {
        // by default we track changes for all the record fields
        return Object.keys(fields);
    }

    GetRecordCopy(record) {
        const recordCopy = Object.assign({}, record);
        return Object.freeze(recordCopy);
    }

    GetConfig(customConfig) {
        return Object.assign({}, DEFAULT_CONFIG, customConfig);
    }

    ChangesWereMade() {
        if (!this.isLogActive) {
            return this.trackedFields.some(fieldId => !this.CompareField(fieldId));
        }
        let changesWereMade = false;
        this.trackedFields.forEach(fieldId => {
            changesWereMade = changesWereMade | !this.CompareField(fieldId); 
        });
        return Boolean(changesWereMade);
    }

    CompareField(fieldId) {
        const fieldData = this.fields[fieldId];
        const { Type: type } = fieldData;
        const previousValue = this.recordBeforeChanges[fieldId];
        let currentValue = this.record[fieldId];
        if (currentValue === undefined && previousValue !== undefined) {
            switch (this.config.erasedCompare) {
                case ERASED_COMPARE.FIX: 
                    currentValue = this.record[fieldId] = this.defaultValues[type]; //
                    if (this.isLogActive && previousValue !== this.defaultValues[type]) {
                        this.log('notice', `### Field ${fieldId} was fixed: ${type}(undefined, ${JSON.stringify(currentValue)})`);
                    }
                    break;
                case ERASED_COMPARE.IGNORE:
                    return true;
            }
        }
        const areEqual = CompareFieldsAccordingToType(previousValue, currentValue, type);
        if (this.isLogActive && !areEqual) {
            this.log('notice', `### ${fieldId} field changed: ${type}(${JSON.stringify(previousValue)}, ${JSON.stringify(currentValue)})`);
        }
        return areEqual;
    }

    ClearTrackedFields() {
        this.trackedFields = [];
    }

    AddTrackedFields(fieldsId) {
        const validFieldIds = fieldsId.filter(id => {
            return this.fields[id] && !this.trackedFields.includes(id);
        })
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

function CompareFieldsAccordingToType(previousValue, currentValue, type) {
    switch (type) {
        case FIELD_TYPES.TEXT:
        case FIELD_TYPES.TRUE_FALSE:
            return previousValue === currentValue;
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
    previousValue = GetLinkAsArray(previousValue); // []
    currentValue = GetLinkAsArray(currentValue); // null
    if (previousValue) {
        if (currentValue) {
            if (previousValue.length === currentValue.length) {
                previousValue.sort(LinkSortCompare);
                currentValue.sort(LinkSortCompare);
                return currentValue.every(({ _id }, i) => _id === previousValue[i]._id);
            }
            return false;
        } 
        return false; // previous value was defined but current isn't
    }
    return !currentValue;
}

function GetLinkAsArray(link) {
    if (Array.isArray(link)) {
        if (link.length) {
            return link.slice(); // to avoid modifying the original array order later on 
        }
        return null;
    } else if (typeof link === 'object' && link !== null) {
        return [link];
    }
    return null;
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
