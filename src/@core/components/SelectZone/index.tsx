import React, { useState, useEffect } from "react";
import { Grid, FormControl, IconButton, Button, TextField } from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import CountryAndCity from "src/views/shop-settings/CountryAndCity";
import MultipleSelectChip from "../multi-select";
import { getZones } from "src/@apiCore/npoints";


const SelectZones = ({a, i, adress, setAdress, removeAdress, t, isTarif }) => {
  const [zoneList, setZoneList] = useState([])

    useEffect(() => {
        if(a?.city && isTarif){
        getZones(`city=${a?.city}`)
        .then((response) => {
            if(response?.data?.success)
            setZoneList(response?.data?.data)
        })
        .catch((error) => {
            console.error(error)
        })
        }else{
        setZoneList([])
        }
    }, [a?.city])

  return (
   <>
        <CountryAndCity
            defaultCountry={a?.country}
            disableCountry={isTarif}
            defaultCity={a?.city}
            setCountry={(value:string) => setAdress(adress.map((a, ind) => ind === i ? {...a, country: value} : a))}
            setValues={(value:string) => setAdress(adress.map((a, ind) => ind === i ? {...a, city: value} : a))}
            sm={isTarif ? 3 : 4}  
        />
        {!isTarif &&
            <Grid item xs={12} sm={2}>
                <TextField
                    fullWidth
                    label={t('adress')}
                    placeholder={t('adress_placeholder')+''}
                    name='adress'
                    value={a?.adress}
                    onChange={(event) => setAdress(adress.map((a, ind) => ind === i ? {...a, adress: event.target.value} : a))}
                    required
                />
            </Grid>
        }
        
        {isTarif && 
            <>
                <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                    <MultipleSelectChip
                        isCity
                        list={zoneList}
                        values={a?.zone}
                        setValues={(value:[]) => setAdress(adress.map((a, ind) => ind === i ? {...a, zone: [...value]} : a))}
                        name={t('zone')}
                        required={true}
                    />
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <TextField
                        fullWidth
                        label={t('tarif')}
                        inputProps={{
                            min: 0
                        }}
                        type="number"
                        placeholder={t('tarif_placeholder')+''}
                        name='tarif'
                        value={a.tarif}
                        onChange={(event) => setAdress(adress.map((a, ind) => ind === i ? {...a, tarif: event.target.value} : a))}
                        required
                    />
                </Grid>
            </>
        }
        
        
        <Grid item xs={12} sm={1}>
        <IconButton onClick={() => removeAdress(i)}>
            <Delete sx={{color: 'red'}} />
        </IconButton>
        </Grid>
    </>
  );
};

export default SelectZones;
