(function(){
	'use strict';
	var pathname = location.pathname.split(/\/+/).slice(0, -1).join('/'),
		path, alias, cache;

	alias = {};
	cache = {};

	function resolve(src, dest){
		var item;

		src = src.split(/\/+/);
		dest = dest.split(/\/+/);

		while(dest.length){
			item = dest.shift();

			if(item === '..'){
				src.pop();
			}else if(item !== '.'){
				src.push(item);
			}
		}

		return src.join('/').replace(/\/+/g, '/').replace(/\/+$/, '');
	}

	// Returns file's info about path and name
	function split(uri, base){
		var name, file, extension;

		uri = uri.split(/\/+/);
		name = uri.pop();
		extension = name.match(/\.\w+$/);

		if(!extension){
			extension = '.js';
			name += extension;
		}else{
			extension = extension[0];
		}

		file = {
			path: resolve(base || pathname, uri.join('/')),
			name: name,
			extension: extension
		};

		file.full = file.path + '/' + file.name;

		return file;
	}

	function config(options){
		var keys, files, key;

		keys = Object.keys(options.alias || {});
		files = options.start || [];

		// Add aliases to list
		while(keys.length){
			key = keys.shift();
			alias[key] = split(options.alias[key]);
		}

		// Compile all initial files
		while(files.length){
			require(split(files.shift()));
		}
	}

	function require(file){
		var exports, request;

		// If module is already exists
		if(cache.hasOwnProperty(file.full)){
			return cache[file.full];
		}

		// Load new module (sync request)
		request = new XMLHttpRequest();
		request.open('GET', location.origin + file.full, false);
		request.send();

		// Throw an error if script wasn't loaded
		if(request.readyState !== 4 || request.status !== 200){
			throw new Error('Module ' + file.full + ' can\'t be loaded');
		}

		// Processing module's code
		if(file.extension === '.js'){
			exports = compile(file, request.responseText);
		}else{
			exports = JSON.parse(request.responseText);
		}

		// If exports object is not exists
		if(!exports){
			throw new Error('Module ' + file.full + ' does not declare anything');
		}

		// Cache module's instance for next requests
		cache[file.full] = exports;

		// Prevent all manipulation with module instance
		Object.freeze(exports);

		return exports;

	}

	function compile(file, codebase){
		var module = { exports: {} };

		// Add sourceURL for better debugging
		codebase = '"use strict";\n' + codebase + '\n//@ sourceURL=' + file.full;

		/* jshint -W054 */
		// Compile module by creating new scope
		new Function('require', 'module', 'exports', codebase)(function(identifier){
			return require(alias[identifier] || split(identifier, file.path));
		}, module, module.exports);

		return module.exports;
	}

	window.loader = {
		config: config
	};
})();