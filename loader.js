(function(){
	'use strict';
	var alias = {}, cache = {};

	function path(uri){
		return uri.split(/\/+/).slice(0, -1).join('/') || '.';
	}

	function extension(uri){
		/* jshint -W092 */
		return /\.\w+$/.test(uri) ? uri : uri + '.js';
	}

	function filename(uri){
		return extension(uri.split(/\/+/).pop());
	}

	function resolve(source, destination){
		var item;

		source = source.split(/\/+/);
		destination = destination.split(/\/+/);

		while(destination.length){
			item = destination.shift();

			if(item === '..'){
				source.pop();
			}else if(item !== '.'){
				source.push(item);
			}
		}

		// Remove first element of path if it's empty or '.'
		return source.join('/').replace(/^[\.\/]+/, '');
	}

	function compile(identifier, base, code){
		var module = { exports: {} };

		// Add sourceURL for better debugging
		code = '"use strict";\n' + code + '\n//@ sourceURL=' + identifier;

		/* jshint -W054 */
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
		if(request.readyState !== 4 || request.status !== 200){
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
		var aliasList, initial, name;

		aliasList = Object.keys(options.alias || {});
		initial = options.start || [];

		// Add aliases to list
		while(aliasList.length){
			name = aliasList.shift();
			alias[name] = extension(options.alias[name]);
		}

		// Compile all initial points
		while(initial.length){
			name = initial.shift();
			require(name, path(name));
		}
	}

	window.loader = {
		config: config
	};
})();