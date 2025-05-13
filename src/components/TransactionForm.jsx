import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import RestClient from '../rest/CategoryClient'
import { Grid, Button, FormControl, FormControlLabel, FormLabel, RadioGroup, Radio, Select, MenuItem, TextField, OutlinedInput, InputBase } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SubmitResponse from './SubmitResponse';

const defaultValues = {
    transactionCategory: "Category",
    amount: "",
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
    color: 'white',
    input: { color: 'white' },
    label: { color: 'white' },
    border: { color: 'white' },
    '& .MuiSelect-select': {
        color: 'white',
    },
    '& .MuiMenuItem-root': {
        color: 'white',
        backgroundColor: '#282c34',
        '&:hover': {
            backgroundColor: '#3a3f4b',
        },
    },
    '& .MuiPaper-root': {
        backgroundColor: '#282c34',
    },
}));
 
export default function TransactionForm(props) {
    const [formValues, setFormValues] = useState(defaultValues);
    const [submitted, setSubmitted] = useState(false);
    const [submittionSuccess, setSubmissionSuccess] = useState(false);
    const [submissionMessage, setSubmissionMessage] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues({
            ...formValues,
            [name]: value,
        });
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
        RestClient.post('/finance/submit-transaction', transactionData)
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
    }

    return (
        <form onSubmit={handleSubmit}>
            <StyledGrid container alignItems="center" justify="center" direction="column">
                <StyledGrid item>
                    <FormControl sx={{ m: 1, width: 150 }}>
                        <StyledTextArea
                            id="transactionCategory"
                            name="transactionCategory"
                            label="Category"
                            autoWidth
                            type="text"
                            variant="outlined"
                            value={formValues.transactionCategory}
                            onChange={handleChange}
                            select
                        >
                            {props.categories.map((category) => (
                                <MenuItem key={category.categoryName} value={category.categoryName}>
                                    {category.categoryName}
                                </MenuItem>
                            ))}
                        </StyledTextArea>
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
                    <FormControl>
                        <FormLabel>Essential</FormLabel>
                        <RadioGroup
                            name="essential"
                            value={formValues.essential}
                            onChange={handleChange}
                            row>
                            <FormControlLabel
                                key="yes"
                                value="true"
                                control={<Radio size="medium" />}
                                label="Yes"
                            />
                            <FormControlLabel
                                key="no"
                                value="false"
                                control={<Radio size="medium" />}
                                label="No"
                            />
                        </RadioGroup>
                    </FormControl>
                </StyledGrid>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
            </StyledGrid>
            <SubmitResponse submitSuccessful={submittionSuccess} submitResponse = {submissionMessage} submitted={submitted}/>
        </form>  
    )
}