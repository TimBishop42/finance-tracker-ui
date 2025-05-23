

export default function SubmitResponse(props) {

    const response = props.submitSuccessful;
    const submitResponse = props.submitResponse;

    if (props.submitted) {
        if (response) {
            return <h1>Submittion Successful!</h1>
        }
        else {
            return <h1>Submittion Failed! {submitResponse.data.message}</h1>
        }
    }
}