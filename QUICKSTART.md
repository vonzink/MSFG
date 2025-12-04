# Quick Start Guide - Batch Pricing Tool

## What You Have

You now have a complete batch pricing tool that can:
- ✅ Accept CSV/Excel uploads with borrower data
- ✅ Calculate LLPM adjustments for multiple loans
- ✅ Show new rates, payments, and cost comparisons
- ✅ Export results to CSV/Excel
- ✅ Run entirely in the browser (no server needed)

## Files Created

### Core Application Files (Required)
1. **BatchPricingTool.html** - Main application interface
2. **batch-pricing.js** - Application logic
3. **llpm-data.js** - Pricing matrices (shared with LLPMTool)

### Additional Files
4. **sample-borrowers.csv** - Test data (10 sample borrowers)
5. **README.md** - Complete documentation
6. **AWS-DEPLOYMENT.md** - AWS deployment instructions
7. **LLPMTool.html** - Original single-loan tool
8. **llpm.js** - Original single-loan logic

## Test Locally (Right Now!)

### Option 1: Simple Python Server

```bash
cd "/Users/zacharyzink/CODE/Pricing Project"
python3 -m http.server 8000
```

Then open in browser: http://localhost:8000/BatchPricingTool.html

### Option 2: Using Node.js

```bash
cd "/Users/zacharyzink/CODE/Pricing Project"
npx http-server -p 8000
```

Then open: http://localhost:8000/BatchPricingTool.html

### Option 3: VS Code Live Server

1. Open folder in VS Code
2. Install "Live Server" extension
3. Right-click `BatchPricingTool.html`
4. Select "Open with Live Server"

## Quick Test

1. **Start local server** (see above)

2. **Open the tool** in your browser

3. **Upload test file**:
   - Drag `sample-borrowers.csv` into the upload zone
   - Or click to browse and select it

4. **Verify column mapping**:
   - Columns should auto-detect
   - Click "Confirm Mapping & Continue"

5. **Set parameters**:
   - Base Rate: 6.750%
   - Starting Points: 0.000
   - New Loan Program: Conventional
   - New Refinance Type: Rate/Term Refi
   - Click "Calculate Pricing"

6. **View results**:
   - See statistics (Total Loans, Avg Adjustments, etc.)
   - Browse the results table
   - Try sorting by clicking column headers
   - Search for a borrower name

7. **Export**:
   - Click "Export to CSV" or "Export to Excel"
   - Verify the downloaded file

## Deploy to AWS (5 Minutes)

### Prerequisites
- AWS account
- Existing S3 bucket (or create new one)
- AWS credentials configured

### Quick Deploy

```bash
# Navigate to project
cd "/Users/zacharyzink/CODE/Pricing Project"

# Upload to S3 (replace YOUR-BUCKET-NAME)
aws s3 cp BatchPricingTool.html s3://YOUR-BUCKET-NAME/ --acl public-read
aws s3 cp batch-pricing.js s3://YOUR-BUCKET-NAME/ --acl public-read
aws s3 cp llpm-data.js s3://YOUR-BUCKET-NAME/ --acl public-read

# Enable website hosting
aws s3 website s3://YOUR-BUCKET-NAME/ --index-document BatchPricingTool.html
```

### Access Your Tool

URL format: `http://YOUR-BUCKET-NAME.s3-website-REGION.amazonaws.com/BatchPricingTool.html`

Example: `http://loan-tools-hub.s3-website-us-west-1.amazonaws.com/BatchPricingTool.html`

## Creating Your Own Data File

### Excel/CSV Template

Create a file with these columns:

| Column Name | Type | Example | Required |
|-------------|------|---------|----------|
| Client Name | Text | "John Smith" | ✅ Yes |
| Loan Amount | Number | 450000 | ✅ Yes |
| Property Value | Number | 500000 | ✅ Yes |
| Current Payment | Number | 2800 | ✅ Yes |
| Credit Score | Number | 720 | ✅ Yes |
| Income | Number | 85000 | No |
| Zip Code | Text | "90210" | No |
| Loan Program | Text | "Conventional" | No |
| Product Type | Text | "Fixed" | No |
| Property Type | Text | "Single Family" | No |
| Occupancy | Text | "Primary" | No |
| Units | Number | 1 | No |

### Tips
- Column names are flexible (tool auto-detects)
- Numbers should NOT have $ or % symbols in the file
- Credit Score as number (e.g., 720, not "720-739")
- Loan Program: Conventional, FHA, VA, or USDA
- Product Type: Fixed or ARM
- Occupancy: Primary, Secondary Home, or Investment

### Sample Row

```csv
Client Name,Loan Amount,Property Value,Income,Zip Code,Credit Score,Loan Program,Product Type,Property Type,Occupancy,Current Payment,Units
John Smith,450000,500000,85000,90210,720,Conventional,Fixed,Single Family,Primary,2800,1
```

## Understanding Your Results

### What the Tool Calculates

For each borrower:
1. **LTV** - Loan to Value ratio
2. **LLPM Adjustments** - All applicable pricing adjustments
3. **Final Points** - Total point cost/credit
4. **Adjusted Rate** - New interest rate (base rate)
5. **New Payment** - Monthly P&I payment (30-year fixed)
6. **Payment Change** - Difference from current payment
7. **Point Cost** - Dollar amount of points

### Reading the Results

**Point Cost:**
- Negative (green) = Credit to borrower
- Positive (red) = Cost to borrower
- Example: -$2,250 means borrower gets $2,250 credit

**Payment Change:**
- Negative (green) = Savings
- Positive (red) = Payment increase
- Example: -$150 means payment goes down by $150/month

## Common Use Cases

### 1. Rate/Term Refinance Portfolio

**Goal:** Calculate new payments for refinancing existing loans

**Setup:**
- Base Rate: Current market rate
- Starting Points: 0.000
- New Loan Program: Conventional (or existing program)
- New Refinance Type: Rate/Term

**What You Get:** Shows which borrowers benefit most from refinancing

### 2. Cash-Out Refinance Analysis

**Setup:**
- Base Rate: Current market rate
- Starting Points: 0.000
- New Refinance Type: Cash-Out

**What You Get:** Additional 0.375 point adjustment for cash-out

### 3. HomeReady® Eligible Borrowers

**Setup:**
- Toggle HomeReady® Eligible: ON
- All LLPAs are waived

**What You Get:** Maximum savings for eligible borrowers

### 4. Program Comparison

**Process:**
1. Calculate with Conventional program
2. Export results
3. Click "Start Over"
4. Upload same file
5. Calculate with FHA program
6. Export results
7. Compare the two exports

## Customization

### Update Pricing Matrices

Edit `llpm-data.js` to change:
- Credit score adjustments
- LTV tier adjustments
- Product type fees
- Program-specific pricing

Changes automatically apply to both batch and single-loan tools.

### Update Base Rates

The tool accepts any base rate. Update as market rates change:
- Conventional: 6.750% (example)
- FHA: 6.500% (example)
- VA: 6.625% (example)

### Branding

Edit `BatchPricingTool.html` to customize:
- Logo (line 19): Update `background-image` URL
- Title (line 6): Change page title
- Header (line 100): Modify tool name
- Back link (line 92): Point to your hub

## Troubleshooting

### Upload Issues

**Problem:** File won't upload
- **Solution:** Ensure file is .csv, .xlsx, or .xls format
- Check file isn't corrupted
- Try exporting fresh copy from Excel

**Problem:** "No data found"
- **Solution:** Ensure file has header row and at least one data row
- Check for hidden rows in Excel

### Calculation Issues

**Problem:** Unexpected results
- **Solution:** Verify credit scores are numeric (720, not "720-739")
- Check loan amounts and property values are numbers
- Ensure Current Payment is filled in

**Problem:** Missing adjustments
- **Solution:** Check that property type, occupancy, etc. are spelled correctly
- Use values from the examples

### Export Issues

**Problem:** Export button doesn't work
- **Solution:** Check browser popup blocker
- Try different browser
- Ensure calculations completed successfully

## Next Steps

1. ✅ Test with sample data
2. ✅ Create your own data file
3. ✅ Deploy to AWS
4. ✅ Share with team
5. ✅ Update pricing matrices as needed

## Need Help?

- **Documentation:** See README.md for complete guide
- **Deployment:** See AWS-DEPLOYMENT.md for AWS setup
- **Sample Data:** Use sample-borrowers.csv as template
- **Original Tool:** LLPMTool.html for single-loan calculations

## Updates

To update pricing or features:

1. Edit the appropriate file locally
2. Test changes locally
3. Upload to S3:
   ```bash
   aws s3 cp FILENAME s3://YOUR-BUCKET-NAME/ --acl public-read
   ```
4. Clear browser cache if needed

## Pro Tips

1. **Use consistent data formatting** - Makes column detection easier
2. **Test with small file first** - Verify mapping before processing hundreds
3. **Export results immediately** - Don't lose calculations
4. **Save your input parameters** - Document rate/points for each run
5. **Compare scenarios** - Run multiple times with different settings

---

**You're ready to go!** 🚀

Start with the local test, then deploy to AWS when ready.
