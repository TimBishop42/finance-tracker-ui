import React, { useState } from 'react';
import { Grid, Button, FormControl, FormControlLabel, FormLabel, RadioGroup, Radio, Select, MenuItem, Slider, TextField } from '@mui/material';

const defaultValues = {
    transactionCategory: "",
    amount: 0.0,
    date: "",
    comments: "",
    essential: false,
};

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
                </Grid>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
            </Grid>
        </form>
    )
}