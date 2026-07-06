import { Modal, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  zonePricing: any[];
  serviceName: string;
}

const PricingModal = ({ open, onClose, zonePricing, serviceName }: PricingModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="pricing-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: {xs: '90%', sm: 600},
        bgcolor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        p: 4,
      }}>
        <Typography 
          id="pricing-modal-title" 
          variant="h6" 
          component="h2" 
          gutterBottom
          sx={{
            color: '#374151',
            fontWeight: '500',
            mb: 3
          }}
        >
          Grille tarifaire - {serviceName}
        </Typography>
        <TableContainer 
          component={Paper} 
          sx={{ 
            mt: 2,
            boxShadow: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                <TableCell sx={{ fontWeight: '500', color: '#374151' }}>Zone</TableCell>
                <TableCell align="right" sx={{ fontWeight: '500', color: '#374151' }}>Prix (€)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {zonePricing.map((zone) => (
                <TableRow 
                  key={zone?.zone?.title}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { backgroundColor: '#F9FAFB' }
                  }}
                >
                  <TableCell 
                    component="th" 
                    scope="row"
                    sx={{ color: '#6B7280' }}
                  >
                    {zone?.zone?.name}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ color: '#6B7280' }}
                  >
                    {zone?.price} €
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Modal>
  );
};

export default PricingModal;