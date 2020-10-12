# ChangesTracker
Tool to track changes in a catalog's record.

```javascript
// OnRecordUpdated.js
const context = {
    Blitz,
    log,
    isLogActive: true
};

const changesTracker = new ChangesTracker(context, record);

UpdateWorkOrderRelatedFields(context, record);
UpdateCommissionableFields(context, record);
UpdateTier(context, record);
UpdateOriginalSalespersonPercentage(context, record);

if (changesTracker.ChangesWereMade()) {
    await Blitz.Catalogs.InvoiceItem.save(record);
    log('notice', 'Updated InvoiceItem record. ' + record._id);
}

```
To run tests:
```
npm i
npm test
```
