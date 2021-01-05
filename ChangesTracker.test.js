const ChangesTracker = require('./ChangesTracker');

const { 
    FIELD_TYPES,
    DEFAULT_VALUES,
    ERASED_COMPARE
} = ChangesTracker;

const Blitz = {
    Catalogs: {
        InvoiceItem: {
            _schema: {
                Fields: [
                    {
                        Type: FIELD_TYPES.TEXT,
                        FieldId: 'MyText'
                    },
                    {
                        Type: FIELD_TYPES.NUMERIC,
                        FieldId: 'MyNumber'
                    },
                    {
                        Type: FIELD_TYPES.TRUE_FALSE,
                        FieldId: 'MyTrueFalse'
                    },
                    {
                        Type: FIELD_TYPES.DATE,
                        FieldId: 'MyDate'
                    },
                    {
                        Type: FIELD_TYPES.LINK,
                        FieldId: 'MyLink'
                    }
                ]
            }
        }
    }
}

function Clean(obj) {
    const propNames = Object.getOwnPropertyNames(obj);
    for (const propName of propNames) {
        if (obj[propName] === null || obj[propName] === undefined) {
            delete obj[propName];
        }
    }
}

const product1Record = {
    _id: '111',
    Price: 100,
    Available: true,
    schemaId: 'Product'
};

const product2Record = {
    _id: '222',
    Price: 200,
    Available: true,
    schemaId: 'Product'
};

const product3Record = {
    _id: '333',
    Price: 300,
    Available: false,
    schemaId: 'Product'
};

const START_RECORD = {
    _id: '123',
    MyText: 'Life is a mistery',
    MyNumber: 1000,
    MyTrueFalse: true,
    MyDate: new Date(2020, 10, 11),
    MyLink: [product1Record],
    schemaId: 'InvoiceItem',
};

let record;
let changesTracker;
let log = (_, message) => console.log(message);

const context = {
    Blitz,
    log,
    isLogActive: false
};

describe('Basic field types', () => {

    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
    });
    
    test('Record remains unmodified', () => {
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
    
    test('Record changes one of its properties (numeric)', () => {
        record.MyNumber = 1001;
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });
    
    test('Re-assigning same value to property', () => {
        record.MyNumber = 1000;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
    
    test('Changing one property (text) and then changing it back', () => {
        record.MyText = 'Everyone must stand alone';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyText = 'Life is a mistery';
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
    
    test('Changing one property (text)', () => {
        record.MyText = 'Everyone must stand alone';
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });
    
    test('Changing one property (true/false)', () => {
        record.MyTrueFalse = false;
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });
    
    test('Re-assigning same value to property (true/false)', () => {
        record.MyTrueFalse = true;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
    
    test('Changing several properties and setting them back', () => {
        record.MyText = 'Everyone must stand alone';
        record.MyNumber = 1001;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyText = 'Life is a mistery';
        record.MyNumber = 1000;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
    
    test('Changing several properties and setting just one of them back', () => {
        record.MyText = 'Everyone must stand alone';
        record.MyNumber = 1001;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyNumber = 1000;
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });
    
    test('Changing one property (date)', () => {
        record.MyDate = new Date(2020,0,1);
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });
    
    test('Re-assigning same value to property (date)', () => {
        record.MyDate = new Date(2020,10,11);
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });
});

describe('Basic field types (specifying tracked fields)', () => {
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
        changesTracker.ClearTrackedFields();
        changesTracker.AddTrackedFields(['MyText', 'MyTrueFalse']);
    });

    test('Changing tracked field', () => {
        record.MyText = 'Haters gonna hate';
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('Changing un-tracked field', () => {
        record.MyNumber = 1002;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Changing tracked and un-tracked field', () => {
        record.MyNumber = 1002;
        record.MyText = 'Haters gonna hate';
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('Changing tracked and un-tracked field and changing back un-tracked', () => {
        record.MyNumber = 1002;
        record.MyText = 'Haters gonna hate';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyNumber = 1001;
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('Changing tracked and un-tracked field and changing back tracked', () => {
        record.MyNumber = 1002;
        record.MyText = 'Haters gonna hate';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyText = 'Life is a mistery';
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Changing un-tracked fields and then changing tracked fields', () => {
        record.MyNumber = 1002;
        record.MyDate = new Date(2020,11,25);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyText = 'Haters gonna hate';
        record.MyTrueFalse = false;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyText = 'Life is a mistery';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyTrueFalse = true;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Removing tracked field', () => {
        record.MyText = 'Haters gonna hate';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        changesTracker.RemoveTrackedFields(['MyText']);
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

});

describe('Complex examples with specified tracked fields', () => {
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
        changesTracker.ClearTrackedFields();
    });

    function UpdateMyNumber(context, myRecord, n) {
        const { changesTracker } = context;
        myRecord.MyNumber += n;
        if (changesTracker) {
            changesTracker.AddTrackedFields(['MyNumber']);
        }
    }

    function UpdateMyText(context, myRecord, n) {
        const { changesTracker } = context;
        for (let i = 0; i < n; i++) {
            myRecord.MyText += '!';
        }
        if (changesTracker) {
            changesTracker.AddTrackedFields(['MyText']);
        }
    }

    test('Each function specifies properties to track pt.1', () => {
        context.changesTracker = changesTracker;
        UpdateMyNumber(context, record, 0);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        UpdateMyNumber(context, record, 10);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        UpdateMyNumber(context, record, -10);
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Each function specifies properties to track pt.2', () => {
        context.changesTracker = changesTracker;
        UpdateMyNumber(context, record, 0);
        UpdateMyNumber(context, record, 10);
        UpdateMyNumber(context, record, -10);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyText = 'Haters gonna hate!';
        expect(changesTracker.ChangesWereMade()).toBe(false);
        UpdateMyText(context, record, 0);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        changesTracker.ClearTrackedFields();
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

});

describe('Erasing properties', () => {
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
    });

    test('Defined Text field is assigned undefined', () => {
        record.MyText = undefined;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyText).toBe(DEFAULT_VALUES.Text); // ""
    });

    test('Defined Text field is assigned null', () => {
        record.MyText = null;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyText).toBe(null);
    });

    test('Defined Numeric field is assigned undefined', () => {
        record.MyNumber = undefined;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0
    });

    test('Defined Numeric field is assigned undefined and changing back', () => {
        record.MyNumber = undefined;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0
        record.MyNumber = 1000;
        expect(changesTracker.ChangesWereMade()).toBe(false);
        expect(record.MyNumber).toBe(1000);
    });

    test('Undefined Numeric field is assigned undefined', () => {
        const record2 = {};
        record2.schemaId = record.schemaId;
        record2.MyText = record.MyText;
        record2.MyTrueFalse = record.MyTrueFalse;
        record2.MyNumber = undefined;
        changesTracker2 = new ChangesTracker(context, record2);
        expect(changesTracker2.ChangesWereMade()).toBe(false);
        record2.MyNumber = undefined;
        expect(record2.MyNumber).toBe(undefined);
        expect(changesTracker2.ChangesWereMade()).toBe(false);
    });

});


describe('Links (Lookups)', () => {
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
    });

    test('Record remains unmodified', () => {
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Record link is assigned a new value', () => {
        record.MyLink = [product2Record];
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('Record link is assigned same value', () => {
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Record link is assigned new value and then assigned original value back', () => {
        record.MyLink = [product2Record];
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Record link is removed', () => {
        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyLink = null;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [product2Record];
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Link is assigned but not in array', () => {
        record.MyLink = product1Record;
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyLink = product2Record;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Link property is modified (not the _id)', () => {
        const { MyLink } = record;
        MyLink.Price = 300;
        record.MyLink = MyLink;
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('Defined Link is assigned undefined', () => {
        record.MyLink = [product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);
        delete record.MyLink;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyLink).toBe(DEFAULT_VALUES.Link); // null
    });

    test('Link changes but is un-tracked', () => {
        changesTracker.ClearTrackedFields();
        changesTracker.AddTrackedFields(['MyNumber']);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(false);
        record.MyNumber = 2000;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        record.MyNumber = 1000;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Multiple-record-Links', () => {
        record.MyLink = [product1Record, product3Record];

        changesTracker = new ChangesTracker(context, record);
        expect(changesTracker.ChangesWereMade()).toBe(false);

        record.MyLink = [product3Record, product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(false); 

        record.MyLink = [product3Record, product2Record];
        expect(changesTracker.ChangesWereMade()).toBe(true); 

        record.MyLink = [product3Record, product2Record, product1Record];
        expect(changesTracker.ChangesWereMade()).toBe(true); 

        changesTracker = new ChangesTracker(context, record);

        expect(changesTracker.ChangesWereMade()).toBe(false); 

        record.MyLink = [product1Record, product2Record, product3Record];
        expect(changesTracker.ChangesWereMade()).toBe(false);

        record.MyLink = null;
        expect(changesTracker.ChangesWereMade()).toBe(true);

        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

});

describe('Configuration', () => {
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
    });

    test('erasedCompare: FIX (default)', () => {
        changesTracker = new ChangesTracker(context, record, {
            // erasedCompare: ERASED_COMPARE.FIX // default option
        });
        expect(record.MyNumber).toBe(1000);
        delete record.MyNumber;
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0
        // erased property is set to default value and change is detected
    });

    test('erasedCompare: NONE', () => {
        changesTracker = new ChangesTracker(context, record, {
            erasedCompare: ERASED_COMPARE.NONE
        });
        expect(record.MyNumber).toBe(1000);
        delete record.MyNumber;
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(undefined);
        // erased property remains undefined and change is detected (could cause infinite cycle)
    });

    test('erasedCompare: IGNORE', () => {
        changesTracker = new ChangesTracker(context, record, {
            erasedCompare: ERASED_COMPARE.IGNORE
        });
        expect(record.MyNumber).toBe(1000);
        delete record.MyNumber;
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        expect(record.MyNumber).toBe(undefined);
        // erased property remains undefined but change is not detected
    });

    test('Changing default value of field type', () => {
        changesTracker = new ChangesTracker(context, record);
        expect(record.MyNumber).toBe(1000);
        delete record.MyNumber;
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0

        changesTracker.SetDefaultValue(FIELD_TYPES.NUMERIC, -1);
        
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0
        delete record.MyNumber;
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(-1);
    });

});

describe('Complete example', () => {

    beforeAll(() => {
        Blitz.Catalogs[record.schemaId].save = record => {
            if (record.MyNumber === undefined) {
                // undefined/erased properties return to their original value after save
                record.MyNumber = START_RECORD.MyNumber;
            }
        }
    });

    afterAll(() => {
        delete Blitz.Catalogs[record.schemaId].save;
    });

    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
    });

    test('Saving-cycle when record defined property is erased (erasedCompare: FIX)', async () => {
        const endOfTimes = 1000;
        let timesSaved = 0;

        while (timesSaved < endOfTimes) {
            // onRecordUpdated starts
            changesTracker = new ChangesTracker(context, record);

            delete record.MyNumber;

            if (changesTracker.ChangesWereMade()) {
                await Blitz.Catalogs[record.schemaId].save(record);
            }
            else break;
            timesSaved++;
            // onRecordUpdated ends
        }

        expect(timesSaved).toBe(1);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0
    });

    test('Saving-cycle when record defined property is erased (erasedCompare: IGNORE)', async () => {
        const endOfTimes = 1000;
        let timesSaved = 0;

        while (timesSaved < endOfTimes) {
            // onRecordUpdated starts
            changesTracker = new ChangesTracker(context, record, {
                erasedCompare: ERASED_COMPARE.IGNORE
            });

            delete record.MyNumber;

            if (changesTracker.ChangesWereMade()) {
                await Blitz.Catalogs[record.schemaId].save(record);
            }
            else break;
            timesSaved++;
            // onRecordUpdated ends
        }

        expect(timesSaved).toBe(0);
        
    });

    test('Saving-cycle when record defined property is erased (erasedCompare: NONE) (infinite cycle)', async () => {
        const endOfTimes = 1000;
        let timesSaved = 0;

        while (timesSaved < endOfTimes) {
            // onRecordUpdated starts
            changesTracker = new ChangesTracker(context, record, {
                erasedCompare: ERASED_COMPARE.NONE
            });

            delete record.MyNumber;

            if (changesTracker.ChangesWereMade()) { // always true (MyNumber => 1000 vs. undefined)
                await Blitz.Catalogs[record.schemaId].save(record); // MyNumber returns to 1000 after saving because no action is taken
            }
            else break;
            timesSaved++;
            // onRecordUpdated ends
        }

        expect(timesSaved).toBe(endOfTimes);
        expect(record.MyNumber).toBe(START_RECORD.MyNumber);
        
    });

    test('Saving-cycle when record defined property is assigned undefined (erasedCompare: NONE) (infinite cycle)', async () => {
        const endOfTimes = 1000;
        let timesSaved = 0;
        const GetRelatedRecord = () => ({});

        while (timesSaved < endOfTimes) {
            // onRecordUpdated starts
            changesTracker = new ChangesTracker(context, record, {
                erasedCompare: ERASED_COMPARE.NONE
            });

            const relatedRecord = GetRelatedRecord(record);
            record.MyNumber = relatedRecord.MyNumber;

            if (changesTracker.ChangesWereMade()) {  // always true (MyNumber => 1000 vs. undefined)
                await Blitz.Catalogs[record.schemaId].save(record); // MyNumber returns to 1000 after saving because no action is taken
            }
            else break;
            timesSaved++;
            // onRecordUpdated ends
        }

        expect(timesSaved).toBe(endOfTimes);
        expect(record.MyNumber).toBe(START_RECORD.MyNumber);
        
    });

});


describe('Assigning wrong data', () => {
    
    beforeEach(() => {
        record = Object.assign({}, START_RECORD);
        changesTracker = new ChangesTracker(context, record);
    });
    
    test('Numeric - null', () => {
        record.MyNumber = null;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(null);
    });

    test('Numeric - null (pt.2)', () => {
        record = Object.assign({}, START_RECORD);
        record.MyNumber = null;
        changesTracker = new ChangesTracker(context, record);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        Clean(record);
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(DEFAULT_VALUES.Numeric); // 0

    });

    test('Numeric - null (pt.3)', () => {
        record = Object.assign({}, START_RECORD);
        delete record.MyNumber;
        changesTracker = new ChangesTracker(context, record);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        Clean(record);
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('Numeric - text', () => {
        record = Object.assign({}, START_RECORD, { MyNumber: 'bad data' });
        changesTracker = new ChangesTracker(context, record);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        Clean(record);
        expect(record.MyNumber).toBe('bad data');
    });

    test('Numeric - text', () => {
        record.MyNumber = 'bad data';
        expect(changesTracker.ChangesWereMade()).toBe(true);
        Clean(record);
        expect(record.MyNumber).toBe('bad data');
    });

    test('Null - undefined', () => {
        record.MyNumber = null;
        expect(changesTracker.ChangesWereMade()).toBe(true);
        changesTracker = new ChangesTracker(context, record);
        expect(changesTracker.ChangesWereMade()).toBe(false);
        Clean(record);
        expect(record.MyNumber).toBe(undefined);
        expect(changesTracker.ChangesWereMade()).toBe(true);
        expect(record.MyNumber).toBe(0);
        Clean(record);
    });

    test('undefined - null', () => {
        record = Object.assign({}, START_RECORD);
        delete record.MyNumber;
        expect(changesTracker.ChangesWereMade()).toBe(false);
        Clean(record);
        expect(record.MyNumber).toBe(undefined);
    }); 

});

describe('Links [] / null', () => {
    
    test('[] -> null', () => {
        record = Object.assign({}, START_RECORD);
        record.MyLink = [];
        changesTracker = new ChangesTracker(context, record);
        record.MyLink = null;
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('null -> []', () => {
        record = Object.assign({}, START_RECORD);
        record.MyLink = null;
        changesTracker = new ChangesTracker(context, record);
        record.MyLink = [];
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

});

describe('NaN', () => {
    test('NaN === NaN', () => {
        record = Object.assign({}, START_RECORD);
        record.MyNumber = 0/0; // NaN
        changesTracker = new ChangesTracker(context, record);
        record.MyNumber = 0/0; // NaN
        expect(changesTracker.ChangesWereMade()).toBe(false);
    });

    test('null === NaN', () => {
        record = Object.assign({}, START_RECORD);
        record.MyNumber = null;
        changesTracker = new ChangesTracker(context, record);
        record.MyNumber = 0/0; // NaN
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('NaN === null', () => {
        record = Object.assign({}, START_RECORD);
        record.MyNumber = null;
        changesTracker = new ChangesTracker(context, record);
        record.MyNumber = 0/0; // NaN
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

    test('0 === null', () => {
        record = Object.assign({}, START_RECORD);
        record.MyNumber = 0;
        changesTracker = new ChangesTracker(context, record);
        record.MyNumber = 0/0; // NaN
        expect(changesTracker.ChangesWereMade()).toBe(true);
    });

});

