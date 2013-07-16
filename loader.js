(function(){
	'use strict';
	var alias = {}, cache = {};

	function path(uri){
		return uri.split(/\/+/).slice(0, -1).join('/') || '.';
	}

	function extension(uri){
		return /\.js(on)*$/.test(uri) ? uri : uri + '.js'
	}

	function filename(uri){
		return extension(uri.split(/\/+/).pop());
	}

	function resolve(source, destination){
		var index, item;

		source = source.split(/\/+/);
		destination = destination.split(/\/+/);

		for(index = 0; index < destination.length; index++){
			item = destination[index];

			if(item === '.'){
				continue;
			}

			if(item === '..'){
				source.pop();
				continue;
			}

			source.push(item);
		}

		if(source[0] === '.' || !source[0]){
			source = source.slice(1);
		}

		return source.join('/');
	}

	function compile(identifier, base, code){
		var module = { exports: {} };

		// Add sourceURL for better debugging
		code = '"use strict";\n' + code + '\n//@ sourceURL=' + identifier;

		// Compile module by creating new scope
		new Function('require', 'module', 'exports', code)(function(identifier){
			var url;

			// Check aliases list
			if(alias.hasOwnProperty(identifier)){
				identifier = alias[identifier];
				url = path(identifier);
			}else{
				// Processing module's URL
				url = resolve(base, path(identifier));
				identifier = filename(identifier);

				// Declare valid absolute path
				if(url){
					identifier = url + '/' + identifier;
				}
			}

			return require(identifier, url);
		}, module, module.exports);

		return module.exports;
	}

	function require(identifier, base){
		var request, exports;

		// If module is already exists
		if(cache.hasOwnProperty(identifier)){
			return cache[identifier];
		}

		// Load new module (sync request)
		request = new XMLHttpRequest();
		request.open('GET', identifier, false);
		request.send();

		// Throw an error if script wasn't loaded
		if(request.readyState !== 4 || request.status && request.status !== 200){
			throw new Error('Module ' + identifier + ' can\'t be loaded');
		}

		// Processing module's code
		if(/\.js$/.test(identifier)){
			exports = compile(identifier, base, request.responseText);
		}else{
			// Load JSON content
			exports = JSON.parse(request.responseText);
		}

		// If exports object is not exists
		if(!exports){
			throw new Error('Module ' + identifier + ' does not declare anything');
		}

		// Cache module's instance for next requests
		cache[identifier] = exports;

		// Prevent all manipulation with module instance
		Object.freeze(exports);

		return exports;
	}

	function config(options){
		var aliasList, initial, index, name;

		aliasList = Object.keys(options.alias || {});
		initial = options.start || [];

		// Add aliases to list
		for(index = 0; index < aliasList.length; index++){
			name = aliasList[index];
			alias[name] = extension(options.alias[name]);
		}

		// Compile all initial points
		for(index = 0; index < initial.length; index++){
			require(initial[index], '.');
		}
	}

	window.loader = {
		config: config
	};
})();