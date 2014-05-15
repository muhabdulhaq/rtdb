// © 2014 by Rheosoft. All rights reserved. 
// Licensed under the RTDB Software License version 1.0

// amazon S3 filesystem support
// remember to set your S3 parms in the settings.json
"use strict";
var AWS = require('aws-sdk');

function CFSS3()
{
}

CFSS3.prototype.exists = function(dir, callback) {
	callback(true);
};

CFSS3.prototype.init = function(parms)
{
	AWS.config.update(parms.config);
	this.s3 = new AWS.S3(parms);
};

CFSS3.prototype.name = function()
{
	return 'CFSS3';
};


CFSS3.prototype.get = function (key, callback)
{
	
	this.s3.getObject( { Key : key},function(err, data) {
		if (err) {
			callback(err);
		} else {
			callback (null, JSON.parse(data.Body.toString()));
			}
		});
};

CFSS3.prototype.del = function(fn, callback) {
	var key = fn;
	this.s3.deleteObject({ Key : key },callback);
};



CFSS3.prototype.put = function ( prefix, item, callback, expires)
{
	var buf = new Buffer(JSON.stringify(item));
	
	var key;
	// FIXME need to fix this misalignment somehow :((
	if (item._identity)
		key = prefix + item._identity._id + '.json';
	else if (item._id)
		key = prefix + item._id + '.json';
	else
		{
		callback('No _id found in item.');
		return;
		}
	
	logger.log('debug','CFSS3.put - key:',key );
	
	var expireDate=null;
	if (expires)
		{
		expireDate = new Date(new Date().getTime() + expires);
		this.s3.putObject({ Key : key, Body : buf, Expires: expireDate }, callback) ;
		}
	else
		{
		this.s3.putObject({ Key : key, Body : buf}, callback) ;
		}
};

CFSS3.prototype.list = function (prefix, callback)
{
	
	var self = this;
	var keys = [];
	

	function fetchNext(prefix, nextMarker, callback) {
		
		var options = { Prefix : prefix};
		if (nextMarker)
			options.Marker = nextMarker;
		
		logger.log('debug','CFSS3.list - prefix:' + prefix + ' marker:' + nextMarker);
		self.s3.listObjects(options, function(err, files) {
			if (err) {
				callback(err);
				return;
			} else {
				files.Contents.forEach(function(item) {
					if (item.Size > 0 && item.Key.match('\\.json$')) {
						keys.push(item.Key);
					}
				});
				if (files.IsTruncated) {
					fetchNext(prefix, keys.pop(), callback);
				} else {
					callback(null,keys);
				}
			}
		});

	}
	logger.log('debug','CFSS3.list ', prefix);
	fetchNext(prefix,null,callback);
	
};

module.exports = CFSS3;
					