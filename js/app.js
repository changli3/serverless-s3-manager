angular.module('ngWC2HS3Browser', [])
    .controller('ngWC2HS3BrowserController', function ($scope, $timeout, $http) {
        $scope.setup = 1;
        $scope.AWSConfig = {
            AWS_AccessKeyId: '',
            AWS_SecretAccessKey: '',
            AWS_BucketName: '',
            AWS_Region: 'us-gov-west-1',
            AWS_MaxKeys: 500,
            AWS_Prefix: '',
            AWS_SignedUrl_Expires: '604800'
        };
        $scope.inputs = { "newValue": "", "public": false };
        $scope.isRoot = false;
        $scope.isFile = false;
        $scope.isFolder = false;
        $scope.acl = "private";

        $scope.login = function () {
            $scope.errorMessage = null;
            if ($scope.AWSConfig.AWS_AccessKeyId === ""
                || $scope.AWSConfig.AWS_SecretAccessKey === ""
                || $scope.AWSConfig.AWS_BucketName === ""
            ) {
                $scope.errorMessage = "All fields are required for signon to S3.";
                return;
            }
            $scope.setup = 2;

            $.get("/Utils/ValidateBucket?bucket=" + encodeURIComponent($scope.AWSConfig.AWS_BucketName),
                function (data) {
                    var dt = JSON.parse(data);
                    if (dt.data === "public" || dt.data === "private") {
                        $scope.acl = dt.data;
                        $scope.startBrowse();

                    } else {
                        $scope.setup = 1;
                        $scope.errorMessage = "Invalid S3 bucket. Please retry.";
                        $scope.$apply();
                    }
                });
        };

        $scope.download = function () {
            var params = { Bucket: $scope.AWSConfig.AWS_BucketName, Key: $('#s3tree').jstree('get_selected')[0], Expires: 604800 };
            var url = $scope.bucket.getSignedUrl('getObject', params);
            window.open(url, url);
        }

        $scope.delete = function () {
            var key = $('#s3tree').jstree('get_selected')[0];
            if ($scope.isFolder && $scope.isNotEmpty[key]) {
                $scope.errorMessage = "Folder is not empty. Please remove contents before deleting the folder.";
                return;
            }

            $scope.errorMessage = null;
            $scope.setup = 2;
            $scope.bucket.deleteObject({ Key: key }, function (err, data) {
                if (err) {
                    $scope.errorMessage = "There was an error deleting the object: + err.message";
                } else {
                    $('#s3tree').jstree("delete_node", "#" + key);
                }
                $scope.setup = 3;
                $scope.$apply();
            });
        }

        $scope.upload = function () {
            $scope.inputs.public = false;
            $('#uploadFileModal').modal('show');
        }
        $scope.doUploadFile = function () {
            $scope.errorMessage = null;
            $('#uploadFileModal').modal('hide');
            var files = document.getElementById('uploadfile').files;
            if (!files.length) {
                $scope.errorMessage = 'Please choose a file to upload first.';
                return;
            }
            var file = files[0];
            var fileName = file.name;
            $scope.setup = 2;
            var fKey = ($scope.isRoot ? '' : $('#s3tree').jstree('get_selected')[0]) + fileName;
            var contentToPost = {
                Key: fKey,
                Body: file,
                ContentType: getContentType(fileName)
            };
            if ($scope.inputs.public) contentToPost["ACL"] = 'public-read';
            $scope.bucket.putObject(contentToPost, function (error, data) {
                if (error) {
                    $scope.errorMessage = 'There was an error uploading your photo: ' + error.message;
                }
                else {
                    var newNode = { "id": fKey, "text": fileName, "icon": "jstree-file" };
                    $('#s3tree').jstree("create_node", $('#s3tree').jstree('get_selected')[0], newNode, false, false);
                }
                $scope.setup = 3;
                $scope.$apply();
            });
        }

        $scope.createFolder = function () {
            $scope.inputs.newValue = "";
            $('#createFolderModal').modal('show');
        }
        $scope.doCreateFolder = function () {
            $scope.errorMessage = null;
            $('#createFolderModal').modal('hide');
            $scope.setup = 2;
            var contentToPost = {
                Key: ($scope.isRoot ? '' : $('#s3tree').jstree('get_selected')[0]) + $scope.inputs.newValue + '/',
                Body: "Folder created by WCH2 Console",
                ContentEncoding: 'base64',
                ServerSideEncryption: 'AES256'
            };
            $scope.bucket.putObject(contentToPost, function (error, data) {
                if (error) {
                    $scope.errorMessage = "There was an error creating the object: + error.message";
                }
                else {
                    var newNode = { "id": $scope.inputs.newValue + '/', "text": $scope.inputs.newValue, "children": [], "icon": "jstree-folder" };
                    $('#s3tree').jstree("create_node", $('#s3tree').jstree('get_selected')[0], newNode, false, false);
                }
                $scope.setup = 3;
                $scope.$apply();
            })
                .on('httpUploadProgress', function (progress) {
                    console.log(Math.round(progress.loaded / progress.total * 100) + '% done');
                });

        }

        $scope.loadNode = function (prefix) {
            $scope.errorMessage = null;
            $scope.bucket.listObjects({ MaxKeys: $scope.AWSConfig.AWS_MaxKeys, Prefix: prefix, Delimiter: '/' },
                function (err, data) {
                    $scope.setup = 3;
                    if (err) {
                        $scope.errorMessage = "Error reading from S3. Please check the credentials again.";
                    } else {
                        var truncated = data.IsTruncated;
                        var nextMarker = data.NextMarker;
                        var sid = $('#s3tree').jstree('get_selected')[0];

                        var l = data.CommonPrefixes.length;
                        for (var i = data.CommonPrefixes.length - 1; i >= 0; i--) {
                            var value = data.CommonPrefixes[i];
                            var newNode = { "text": getPrefixName(value.Prefix), "id": value.Prefix, "icon": "jstree-folder", "children": [] };
                            $('#s3tree').jstree("create_node", sid, newNode, false, false);
                            $scope.lazyNodes[value.Prefix] = true;
                            $scope.isNotEmpty[sid] = true;
                        }
                        l = data.Contents.length;
                        for (var i = data.Contents.length - 1; i >= 0; i--) {
                            var value = data.Contents[i];
                            if (value.Key[value.Key.length - 1] == '/') continue;
                            var newNode = { "text": getPrefixName(value.Key) + ' (' + Math.ceil(value.Size / 1024) + 'K)', "id": value.Key, "icon": "jstree-file" };
                            $('#s3tree').jstree("create_node", sid, newNode, false, false);
                            $scope.isNotEmpty[sid] = true;
                        };
                        $("#s3tree").jstree("open_node", sid);
                    }
                    $scope.$apply();
                });
        }

        $scope.startBrowse = function () {
            $scope.treeRoot = { "text": $scope.AWSConfig.AWS_BucketName, "children": [], "state": { "opened": true } };
            $scope.lazyNodes = [];
            $scope.isNotEmpty = [];
            AWS.config.region = $scope.AWSConfig.AWS_Region;
            AWS.config.update({ accessKeyId: $scope.AWSConfig.AWS_AccessKeyId, secretAccessKey: $scope.AWSConfig.AWS_SecretAccessKey });
            $scope.bucket = new AWS.S3({ params: { Bucket: $scope.AWSConfig.AWS_BucketName } });
            $scope.bucket.listObjects({ MaxKeys: $scope.AWSConfig.AWS_MaxKeys, Prefix: $scope.AWSConfig.AWS_Prefix, Delimiter: '/' },
                function (err, data) {
                    if (err) {
                        $scope.errorMessage = "Error reading from S3. Please check the credentials again.";
                        $scope.setup = 1;
                    } else {
                        $scope.setup = 3;
                        var truncated = data.IsTruncated;
                        var nextMarker = data.NextMarker;

                        angular.forEach(data.Contents, function (value, key) {
                            $scope.treeRoot.children.push({ "text": getPrefixName(value.Key) + ' (' + Math.ceil(value.Size / 1024) + 'K)', "id": value.Key, "icon": "jstree-file" });
                        });
                        angular.forEach(data.CommonPrefixes, function (value, key) {
                            $scope.treeRoot.children.push({ "text": getPrefixName(value.Prefix), "id": value.Prefix, "icon": "jstree-folder", "children": [] });
                            $scope.lazyNodes[value.Prefix] = true;
                        });

                        $timeout(function () {
                            $('#s3tree')
                                .on("changed.jstree", function (e, data) {
                                    if (data.selected.length && data.node) {
                                        $scope.isFolder = data.node.icon === "jstree-folder";
                                        $scope.isFile = data.node.icon === "jstree-file";
                                        $scope.isRoot = !$scope.isFolder && !$scope.isFile;
                                        if ($scope.lazyNodes[data.node.id]) {
                                            console.log("lazy load " + data.node.id)
                                            $scope.setup = 2;
                                            $scope.lazyNodes[data.node.id] = false;
                                            $timeout(function () { $scope.loadNode(data.node.id); }, 10);
                                        }
                                        $scope.$apply();
                                    }
                                })
                                .jstree({
                                    'core': {
                                        'data': [$scope.treeRoot],
                                        'multiple': false,
                                        'check_callback': true
                                    }
                                });
                            $scope.$apply();
                        }, 100);
                    }
                });
        };

    });

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function getContentType(fn) {
    fn = fn.toLowerCase();
    if (fn.endsWith(".html") || fn.endsWith(".htm") || fn.endsWith(".txt")) return "text/html";
    if (fn.endsWith(".gif")) return "image/gif";
    if (fn.endsWith(".js")) return "application/javascript";
    if (fn.endsWith(".json")) return "application/json";
    if (fn.endsWith(".png")) return "image/png";
    if (fn.endsWith(".jpg") || fn.endsWith(".jpeg")) return "image/jpeg";
    if (fn.endsWith(".pdf")) return "application/pdf";
    return "application/octet-stream";
}

function getPrefixName(prefix) {
    var name = prefix;
    if (name[name.length - 1] == '/') name = name.substring(0, name.length - 1);
    if (name.indexOf('/') > 0) {
        name = name.substring(name.lastIndexOf('/') + 1);
    }
    return name;
}

var jsonPrettyPrint = {
    replacer: function (match, pIndent, pKey, pVal, pEnd) {
        var key = '<span class=json-key>';
        var val = '<span class=json-value>';
        var str = '<span class=json-string>';
        var r = pIndent || '';
        if (pKey)
            r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
        if (pVal)
            r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
        return r + (pEnd || '');
    },
    toHtml: function (obj) {
        var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
        return JSON.stringify(obj, null, 3)
            .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(jsonLine, jsonPrettyPrint.replacer);
    }
};

