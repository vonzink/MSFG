<<<<<<< HEAD
# MSFG Batch Pricing Tool

A web-based tool for calculating Loan Level Pricing Adjustments (LLPM) for multiple borrowers simultaneously.

## Features

- **Drag & Drop Upload**: Upload CSV or Excel files with borrower data
- **Flexible Column Mapping**: Automatically detects and maps columns from your file
- **Batch Processing**: Calculate pricing adjustments for multiple loans at once
- **Interactive Results**: Sort, filter, and search through results
- **Export Options**: Download results as CSV or Excel
- **30-Year Fixed Calculations**: Automatic payment calculations for refinances
- **LLPM Integration**: Uses the same pricing logic as the single-loan LLPM Tool

## Getting Started

### Files Included

- `BatchPricingTool.html` - Main application interface
- `batch-pricing.js` - Application logic and calculations
- `llpm-data.js` - Pricing adjustment matrices (shared with LLPMTool)
- `llpm.js` - Core calculation engine (optional reference)
- `sample-borrowers.csv` - Example data file for testing

### Installation

1. **Upload to AWS S3**:
   - Upload all files to your S3 bucket
   - Make sure the bucket has static website hosting enabled
   - Set the index document to `BatchPricingTool.html`

2. **File Permissions**:
   - Ensure all files have public read permissions
   - Configure CORS if needed for cross-origin requests

3. **Dependencies**:
   - The tool uses SheetJS (XLSX) library loaded via CDN
   - No other dependencies required

## Usage

### 1. Prepare Your Data File

Create a CSV or Excel file with the following columns (flexible column names):

**Required Columns:**
- Client Name
- Loan Amount
- Property Value
- Credit Score (numeric value, e.g., 720)
- Current Payment

**Optional Columns:**
- Income
- Zip Code
- Loan Program (Conventional, FHA, VA, USDA)
- Product Type (Fixed, ARM)
- Property Type (Single Family, Condo, Manufactured Home, etc.)
- Occupancy (Primary, Secondary Home, Investment)
- Units (1, 2, 3, 4)

**Example CSV Format:**
```csv
Client Name,Loan Amount,Property Value,Income,Zip Code,Credit Score,Loan Program,Product Type,Property Type,Occupancy,Current Payment,Units
John Smith,450000,500000,85000,90210,720,Conventional,Fixed,Single Family,Primary,2800,1
Sarah Johnson,350000,400000,65000,10001,680,FHA,Fixed,Condo,Primary,2200,1
```

### 2. Upload Your File

1. Open the Batch Pricing Tool in your browser
2. Drag and drop your CSV/Excel file into the upload zone, or click to browse
3. The tool will automatically detect your columns

### 3. Verify Column Mapping

1. Review the automatically detected column mappings
2. Adjust any mappings that weren't detected correctly
3. Ensure all required fields are mapped
4. Click "Confirm Mapping & Continue"

### 4. Set Pricing Parameters

Configure the global pricing inputs:

- **Base Rate**: The starting interest rate (e.g., 6.750%)
- **Starting Points**: Initial point adjustment (e.g., 0.000)
- **New Loan Program**: The loan program for all refinances (Conventional, FHA, VA, USDA)
- **New Refinance Type**: Rate/Term, Cash-Out, or Purchase
- **HomeReady® Eligible**: Toggle on if all borrowers qualify for LLPA waiver

### 5. Calculate Results

1. Click "Calculate Pricing"
2. View the results summary with key statistics:
   - Total Loans
   - Average Rate Adjustment
   - Total Loan Volume
   - Average Payment Savings

3. Review the detailed results table showing:
   - Client Name
   - Loan Amount
   - Current Payment
   - New Rate (adjusted)
   - New Payment
   - Payment Change (positive = increase, negative = savings)
   - Point Cost (positive = cost, negative = credit)
   - Total Adjustments

### 6. Export Results

- **Search**: Filter results by client name using the search box
- **Sort**: Click column headers to sort by that column
- **Export to CSV**: Download results as a CSV file
- **Export to Excel**: Download results as an Excel spreadsheet
- **Start Over**: Reset the tool to upload a new file

## Understanding the Results

### Rate Adjustments

The tool calculates Loan Level Pricing Adjustments (LLPAs) based on:

- Credit Score tier
- Loan-to-Value (LTV) ratio
- Property type and characteristics
- Occupancy type
- Loan program
- Product type (Fixed vs ARM)
- Number of units

### Points Calculation

- **Positive points** = Cost to borrower (price down)
- **Negative points** = Credit to borrower (price up)
- **Point Cost** = Loan Amount × (Final Points ÷ 100)

### Payment Calculation

- All loans are calculated as 30-year fixed mortgages
- **New Payment** = Monthly P&I payment at the adjusted rate
- **Payment Change** = New Payment - Current Payment
  - Negative (green) = Savings
  - Positive (red) = Increase

### HomeReady® Waiver

When enabled, this feature:
- Applies to all borrowers in the batch
- Offsets total LLPM adjustments
- Provides maximum benefit for eligible borrowers
- Results in lower overall costs

## Technical Details

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- No plugins required

### File Size Limits

- Recommended: Up to 1,000 borrowers
- Maximum file size: 10MB
- Larger files may cause performance issues

### Data Privacy

- All processing happens in the browser
- No data is sent to external servers
- Files are not stored or transmitted
- Results remain local to your session

### Calculation Engine

The tool uses the same LLPM calculation engine as the single-loan LLPMTool, ensuring consistency across tools:

- Shares `llpm-data.js` for pricing matrices
- Supports all four loan programs (Conventional, FHA, VA, USDA)
- Applies combo adjustments where applicable
- Handles property type combinations

## Troubleshooting

### File Upload Issues

- **File not recognized**: Ensure it's a valid CSV or Excel file (.csv, .xlsx, .xls)
- **No data found**: Check that your file has headers and at least one data row
- **Empty columns**: Make sure all cells have values or leave optional fields blank

### Mapping Issues

- **Column not detected**: Manually select the correct column from the dropdown
- **Required field missing**: You must map all required fields to proceed
- **Wrong data type**: Ensure numeric fields contain numbers (no $, % symbols in upload file)

### Calculation Issues

- **Unexpected results**: Verify your input data is correct
- **Missing adjustments**: Check that all borrower data fields are properly filled
- **Payment calculation off**: Ensure Current Payment is accurate in source data

### Export Issues

- **Download not starting**: Check browser popup blocker settings
- **File is empty**: Ensure calculations were completed before exporting
- **Excel formatting**: Open in Excel/Numbers/Google Sheets for best formatting

## Support

For issues or questions:
1. Check the console for error messages (F12 in most browsers)
2. Verify your source data format matches the examples
3. Try the sample CSV file to test functionality
4. Contact your MSFG administrator

## Updates

The tool shares the pricing matrix with LLPMTool. When pricing adjustments are updated in `llpm-data.js`, both tools will reflect the changes automatically.

---

**Version**: 1.0
**Last Updated**: 2025-01-26
**Maintained by**: MSFG Technology Team
