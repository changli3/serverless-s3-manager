Serverless S3 Admin
=================================
This is a sample of implement a serverless AWS S3 Admin console. With the cloudformation, it will create a S3 bucket and upload the code to the bucket.


Launch Cloudformation 
==================================
```
git clone https://github.com/changli3/serverless-s3-manager.git
cd serverless-s3-manager


aws cloudformation deploy --stack-name S3Amin --template-file cf.json --parameter-overrides  newBucketName=mys3admin-001 allowIPs="0.0.0.0/0" 
```

If the cloudformation is successful, cp the S3 Admin code into the bucket -

```
aws s3 cp ./s3admin s3://mys3admin-001/ --recursive
```

Setup Managed AWS Buckets
=================================
To use this console to manage a AWS bucket, the bucket has to set up to allow CORS. So before the browser script can access the Amazon S3 bucket, you must first set up its CORS configuration as follows. You can do this in the bucket properties tab in the S3 console.

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

Test the S3 Admin GUI
===============================
Go to s3 public URL, for example, if you are using the us-east-1 region S3 service, you url will be like - https://s3.amazonaws.com/mys3admin-001/index.htm

#### Login Screen
In the login screen, put in the access keys and the managed bucket and region -
![Login Screen](https://raw.githubusercontent.com/changli3/serverless-s3-manager/master/login.png "Login Screen")

#### S3 Admin UI
Once login, click on the files/folders, operations will appear on the right corner -
![S3 Admin UI](https://raw.githubusercontent.com/changli3/serverless-s3-manager/master/ssui.png "S3 UI")