import React, { useState } from 'react';
<<<<<<< HEAD
import { Grid, Button, FormControl, FormControlLabel, FormLabel, RadioGroup, Radio, Select, MenuItem, Slider, TextField } from '@mui/material';
=======
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import RestClient from '../rest/CategoryClient'
import { Grid, Button, FormControl, FormControlLabel, FormLabel, RadioGroup, Radio, Select, MenuItem, TextField, OutlinedInput } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SubmitResponse from './SubmitResponse';
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0

const defaultValues = {
    transactionCategory: "",
    amount: 0.0,
<<<<<<< HEAD
    date: "",
    comments: "",
    essential: false,
};

export default function TransactionForm(props) {
    const [formValues, setFormValues] = useState(defaultValues);
=======
    date: new Date(),
    comments: "",
    companyName: "",
    essential: false,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
    backgroundColor: '#282c34',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: 'white',
}));

const StyledSelect = styled(Select)(({ theme }) => ({
    backgroundColor: '#282c34',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: 'white',
}));


const StyledTextArea = styled(TextField)(({ theme }) => ({
    backgroundColor: '#282c34',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    input: { color: 'white' },
    label: { color: 'white' },
    border: { color: 'white' },
}));


export default function TransactionForm(props) {
    const [formValues, setFormValues] = useState(defaultValues);
    const [submitted, setSubmitted] = useState(false);
    const [submittionSuccess, setSubmissionSuccess] = useState(false);
    const [submissionMessage, setSubmissionMessage] = useState("");
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues({
            ...formValues,
            [name]: value,
        });
<<<<<<< HEAD
    };

    const handleSubmit = (event) => {
        event.preventDefaults();
        alert(formValues);

=======
        setSubmitted(false);
    };

    const handleDateChange = (e) => {
        var dateObj = new Date(e);
        setFormValues({
            ...formValues,
            date: dateObj,
        });
        setSubmitted(false);
    };


    const handleSubmit = (event) => {
        const transactionData = {
            category: formValues.transactionCategory,
            amount: formValues.amount,
            transactionDate: formValues.date.getTime(),
            comment: formValues.comments,
            essential: formValues.essential,
            // companyName: formValues.companyName
        }
        event.preventDefault();
        RestClient.post('/submit-transaction', transactionData)
            .then((response) => {
                setSubmitted(true);
                setSubmissionSuccess(true);
            })
            .catch((error) => {
                if (error.response) {
                    setSubmitted(true);
                    setSubmissionSuccess(false);
                    setSubmissionMessage(error.response);
                    console.log(error.response);
                    console.log("server responded");
                } else if (error.request) {
                    setSubmitted(true);
                    setSubmissionSuccess(false);
                    setSubmissionMessage(error.response);
                    console.log("network error");
                } else {
                    setSubmitted(true);
                    setSubmissionSuccess(false);
                    setSubmissionMessage(error.response);
                    console.log(error);
                };
            });
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
    }

    return (
        <form onSubmit={handleSubmit}>
<<<<<<< HEAD
            <Grid container alignItems="center" justify="center" direction="column">
                <Grid item>
                    <FormControl>
                        <Select
                            id="transactionCategory"
                            name="transactionCategory"
                            label="TransactionCategory"
                            type="text"
                            value={formValues.transactionCategory}
                            onChange={handleChange}
                        >
                            {props.categories.map((category) => (
                                <MenuItem key={category} value={category}>{category}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    <TextField
                        id="amount"
                        label=""
                        type="text"
                        name='Amount'
                        value={formValues.amount}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item>
                    <TextField
                        id="date"
                        label=""
                        type="text"
                        name='Date'
                        value={formValues.date}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item>
                    <TextField
                        id="comments"
                        label=""
                        type="text"
                        name='Comments'
                        value={formValues.comments}
                        onChange={handleChange}
                    />
                </Grid>
                <Grid item>
=======
            <StyledGrid container alignItems="center" justify="center" direction="column">
                <StyledGrid item>
                    <FormControl sx={{ m: 1, width: 150 }}>
                        <StyledSelect
                            id="transactionCategory"
                            name="transactionCategory"
                            label="transactionCategory"
                            autoWidth
                            type="text"
                            value={formValues.transactionCategory}
                            onChange={handleChange}
                            input={<OutlinedInput label="Category" />}
                        >
                            {props.categories.map((category) => (
                                <MenuItem key={category.categoryName} value={category.categoryName}>{category.categoryName}</MenuItem>
                            ))}
                        </StyledSelect>
                    </FormControl>
                </StyledGrid>

                <StyledGrid item>
                    <StyledTextArea
                        id="amount"
                        label="Amount"
                        type="number"
                        name='amount'
                        value={formValues.amount}
                        onChange={handleChange}
                    />
                </StyledGrid>
                {/* <StyledGrid item>
                    <StyledTextArea
                        id="companyName"
                        label="Company Name"
                        type="text"
                        name='companyName'
                        value={formValues.companyName}
                        onChange={handleChange}
                    />
                </StyledGrid> */}
                <StyledGrid item>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            views={['day']}
                            label="date"
                            id="date"
                            name="date"
                            value={formValues.date}
                            onChange={handleDateChange}
                            renderInput={(params) => <StyledTextArea {...params} helperText={null} />}
                        />
                    </LocalizationProvider>
                </StyledGrid>
                <StyledGrid item>
                    <StyledTextArea
                        id="comments"
                        label="Comments"
                        type="text"
                        name='comments'
                        value={formValues.comments}
                        onChange={handleChange}
                    />
                </StyledGrid>
                <StyledGrid item>
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
                    <FormControl>
                        <FormLabel>Essential</FormLabel>
                        <RadioGroup
                            name="essential"
                            value={formValues.essential}
                            onChange={handleChange}
<<<<<<< HEAD
                            row
                        >
                            <FormControlLabel
                                key="yes"
                                value="yes"
                                control={<Radio size="small" />}
=======
                            row>
                            <FormControlLabel
                                key="yes"
                                value="true"
                                control={<Radio size="medium" />}
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
                                label="Yes"
                            />
                            <FormControlLabel
                                key="no"
<<<<<<< HEAD
                                value="no"
                                control={<Radio size="small" />}
=======
                                value="false"
                                control={<Radio size="medium" />}
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
                                label="No"
                            />
                        </RadioGroup>
                    </FormControl>
<<<<<<< HEAD
                </Grid>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
            </Grid>
        </form>
=======
                </StyledGrid>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
            </StyledGrid>
            <SubmitResponse submitSuccessful={submittionSuccess} submitResponse = {submissionMessage} submitted={submitted}/>
        </form>  
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
    )
}