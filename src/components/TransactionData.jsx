import Transactions from "./Transactions"
import AggregateData from "./AggregateData"

export default function TransactionData(props) {

    if(props.aggregateData) {
        return <AggregateData/>
    }
    else {
        return <Transactions/>
    }
}
