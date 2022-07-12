import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import { Grid, Button, FormControl, FormControlLabel, FormLabel, RadioGroup, Radio, Select, MenuItem, Slider, TextField } from '@mui/material';

const defaultValues = {
    transactionCategory: "",
    amount: 0.0,
    date: "",
    comments: "",
    essential: false,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
    backgroundColor: '#282c34',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: 'white',
  }));

export default function TransactionForm(props) {
    const [formValues, setFormValues] = useState(defaultValues);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues({
            ...formValues,
            [name]: value,
        });
    };

    const handleSubmit = (event) => {
        event.preventDefaults();
        alert(formValues);

    }

    return (
        <form onSubmit={handleSubmit}>
            <StyledGrid container alignItems="center" justify="center" direction="column">
                <StyledGrid item>
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
                                <MenuItem key={category.categoryName} value={category.categoryName}>{category.categoryName}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </StyledGrid>

                <StyledGrid item>
                    <TextField
                        id="amount"
                        label=""
                        type="text"
                        name='Amount'
                        value={formValues.amount}
                        onChange={handleChange}
                    />
                </StyledGrid>
                <StyledGrid item>
                    <TextField
                        id="date"
                        label=""
                        type="text"
                        name='Date'
                        value={formValues.date}
                        onChange={handleChange}
                    />
                </StyledGrid>
                <StyledGrid item>
                    <TextField
                        id="comments"
                        label=""
                        type="text"
                        name='Comments'
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
                            row
                        >
                            <FormControlLabel
                                key="yes"
                                value="yes"
                                control={<Radio size="small" />}
                                label="Yes"
                            />
                            <FormControlLabel
                                key="no"
                                value="no"
                                control={<Radio size="small" />}
                                label="No"
                            />
                        </RadioGroup>
                    </FormControl>
                </StyledGrid>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
            </StyledGrid>
        </form>
    )
}