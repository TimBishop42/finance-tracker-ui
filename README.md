### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Building a new version

```docker build -t finance-ui .```
```docker tag finance-ui tbished/finance-ui:v8```
```docker push tbished/finance-ui:v8```

## Transaction Uploader

The TransactionUploader component now supports a multi-stage submission process:

### Stage 1: Upload Raw CSV
- Upload a CSV file containing transaction data.
- The file is parsed and submitted to the backend API for category prediction.
- Endpoint: `POST /transactions/predict-batch`

### Stage 2: Review and Update
- Review the transactions and their predicted categories.
- Update categories and add comments as needed.
- Submit the final batch for processing.
- Endpoint: `POST /finance/submit-transaction-batch`

### Example Usage
```jsx
<TransactionUploader open={open} onClose={handleClose} />
```

### API Endpoints
- `GET /finance/get-categories`: Retrieve available categories.
- `POST /transactions/predict-batch`: Predict categories for a batch of transactions.
- `POST /finance/submit-transaction-batch`: Submit the final batch of transactions.
