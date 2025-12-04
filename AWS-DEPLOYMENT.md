# AWS S3 Deployment Guide

## Quick Deployment Steps

### Option 1: AWS Console (Easiest)

1. **Create/Use S3 Bucket**
   - Go to AWS S3 Console
   - Use existing bucket or create new one
   - Bucket name example: `msfg-loan-tools`

2. **Upload Files**

   Upload these files to your bucket:
   ```
   BatchPricingTool.html
   batch-pricing.js
   llpm-data.js
   LLPMTool.html (optional - if you want both tools)
   llpm.js (optional - only needed for LLPMTool)
   sample-borrowers.csv (optional - for testing)
   ```

3. **Configure Static Website Hosting**
   - Select your bucket
   - Go to Properties tab
   - Scroll to "Static website hosting"
   - Click "Edit"
   - Enable static website hosting
   - Index document: `BatchPricingTool.html`
   - Save changes

4. **Set Permissions**

   **Bucket Policy** (Properties → Permissions → Bucket Policy):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

   Replace `YOUR-BUCKET-NAME` with your actual bucket name.

5. **Access Your Tool**
   - Your website URL will be: `http://YOUR-BUCKET-NAME.s3-website-REGION.amazonaws.com/BatchPricingTool.html`
   - Example: `http://msfg-loan-tools.s3-website-us-west-1.amazonaws.com/BatchPricingTool.html`

### Option 2: AWS CLI (Faster for Updates)

1. **Install AWS CLI**
   ```bash
   # macOS
   brew install awscli

   # Windows
   # Download from https://aws.amazon.com/cli/
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Default region: us-west-1 (or your region)
   # Default output format: json
   ```

3. **Upload Files**
   ```bash
   # Navigate to your project directory
   cd "/Users/zacharyzink/CODE/Pricing Project"

   # Upload all necessary files
   aws s3 cp BatchPricingTool.html s3://YOUR-BUCKET-NAME/ --acl public-read
   aws s3 cp batch-pricing.js s3://YOUR-BUCKET-NAME/ --acl public-read
   aws s3 cp llpm-data.js s3://YOUR-BUCKET-NAME/ --acl public-read
   aws s3 cp sample-borrowers.csv s3://YOUR-BUCKET-NAME/ --acl public-read

   # Optional: Upload both tools
   aws s3 cp LLPMTool.html s3://YOUR-BUCKET-NAME/ --acl public-read
   aws s3 cp llpm.js s3://YOUR-BUCKET-NAME/ --acl public-read
   ```

4. **Enable Website Hosting**
   ```bash
   aws s3 website s3://YOUR-BUCKET-NAME/ --index-document BatchPricingTool.html
   ```

### Option 3: Sync Entire Directory

```bash
cd "/Users/zacharyzink/CODE/Pricing Project"

# Sync all files
aws s3 sync . s3://YOUR-BUCKET-NAME/ \
  --acl public-read \
  --exclude ".git/*" \
  --exclude "*.md" \
  --exclude ".DS_Store"
```

## File Structure in S3

Your S3 bucket should have this structure:

```
s3://YOUR-BUCKET-NAME/
├── BatchPricingTool.html       (Main batch tool)
├── batch-pricing.js            (Batch tool logic)
├── llpm-data.js                (Shared pricing data)
├── LLPMTool.html              (Optional: Single loan tool)
├── llpm.js                     (Optional: Single loan logic)
└── sample-borrowers.csv        (Optional: Test data)
```

## CORS Configuration (If Needed)

If you encounter CORS errors, add this CORS configuration:

1. Go to your S3 bucket
2. Permissions tab → CORS
3. Add this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Custom Domain (Optional)

### Using CloudFront

1. **Create CloudFront Distribution**
   - Origin Domain: Your S3 bucket endpoint
   - Default Root Object: `BatchPricingTool.html`
   - Enable HTTPS

2. **Configure DNS**
   - Add CNAME record pointing to CloudFront distribution
   - Example: `tools.msfg.com` → `d123456.cloudfront.net`

3. **SSL Certificate**
   - Use AWS Certificate Manager
   - Request certificate for your domain
   - Validate via DNS or email
   - Attach to CloudFront distribution

## Security Considerations

### For Internal Use Only

If this tool should only be accessible internally:

1. **Restrict by IP Address**

   Update bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "RestrictToOfficeIP",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
         "Condition": {
           "IpAddress": {
             "aws:SourceIp": [
               "YOUR-OFFICE-IP/32",
               "YOUR-VPN-IP-RANGE/24"
             ]
           }
         }
       }
     ]
   }
   ```

2. **Use CloudFront with Lambda@Edge**
   - Add authentication layer
   - Require login before access
   - Integrate with existing SSO

3. **VPN Access**
   - Keep bucket private
   - Access only through company VPN
   - Use VPC endpoints

### For Public Use with Authentication

1. **Use AWS Amplify**
   - Host static site on Amplify
   - Add Cognito authentication
   - Manage user access

2. **API Gateway + Lambda**
   - Serve files through API Gateway
   - Add authentication middleware
   - Control access programmatically

## Updating the Tool

### Update Single File

```bash
# Update just the JavaScript
aws s3 cp batch-pricing.js s3://YOUR-BUCKET-NAME/ --acl public-read

# Update pricing data (affects both tools)
aws s3 cp llpm-data.js s3://YOUR-BUCKET-NAME/ --acl public-read
```

### Clear CloudFront Cache (if using)

```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/*"
```

## Cost Optimization

### S3 Storage Class

For tools that are actively used:
- Use **S3 Standard** (default)
- Low latency, high availability

For archived versions:
- Move to **S3 Standard-IA** after 30 days
- Set lifecycle policy

### CloudFront Caching

If using CloudFront:
- Cache HTML files: 5 minutes
- Cache JS/CSS files: 1 day
- Cache images: 7 days
- Reduces S3 requests

### Monitoring Costs

```bash
# Check S3 storage usage
aws s3 ls s3://YOUR-BUCKET-NAME --summarize --human-readable --recursive

# View CloudFront usage (if applicable)
aws cloudfront get-distribution --id YOUR-DISTRIBUTION-ID
```

## Testing After Deployment

1. **Access the Tool**
   ```
   http://YOUR-BUCKET-NAME.s3-website-REGION.amazonaws.com/BatchPricingTool.html
   ```

2. **Test File Upload**
   - Download `sample-borrowers.csv`
   - Upload to the tool
   - Verify column detection
   - Complete a calculation

3. **Test Export**
   - Calculate results
   - Export to CSV
   - Export to Excel
   - Verify data accuracy

4. **Browser Testing**
   - Chrome/Edge
   - Firefox
   - Safari
   - Mobile browsers

## Troubleshooting

### 403 Forbidden Error
- Check bucket policy allows public access
- Verify files have public-read ACL
- Check Block Public Access settings

### 404 Not Found
- Verify file names match exactly (case-sensitive)
- Check static website hosting is enabled
- Confirm index document is set correctly

### Files Not Loading
- Check browser console for errors
- Verify all JS modules are uploaded
- Check CORS configuration
- Clear browser cache

### Slow Performance
- Enable CloudFront distribution
- Enable compression in CloudFront
- Optimize file sizes
- Check S3 region proximity to users

## Backup and Versioning

### Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket YOUR-BUCKET-NAME \
  --versioning-configuration Status=Enabled
```

### Download Backup

```bash
# Download all files locally
aws s3 sync s3://YOUR-BUCKET-NAME/ ./backup-$(date +%Y%m%d)/
```

### Restore Previous Version

```bash
# List versions
aws s3api list-object-versions --bucket YOUR-BUCKET-NAME

# Restore specific version
aws s3api get-object \
  --bucket YOUR-BUCKET-NAME \
  --key batch-pricing.js \
  --version-id VERSION-ID \
  batch-pricing.js
```

## Monitoring and Analytics

### CloudWatch Metrics

Monitor:
- Request count
- Error rates
- Data transfer
- Storage usage

### Access Logs

Enable S3 access logging:
```bash
aws s3api put-bucket-logging \
  --bucket YOUR-BUCKET-NAME \
  --bucket-logging-status file://logging.json
```

### Google Analytics (Optional)

Add to `BatchPricingTool.html` before `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA-TRACKING-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA-TRACKING-ID');
</script>
```

## Support Contacts

- AWS Support: https://console.aws.amazon.com/support/
- Internal IT Team: [Your contact info]
- Tool Issues: [GitHub/Issue tracker]

---

**Last Updated**: 2025-01-26
**Maintained by**: MSFG Technology Team
