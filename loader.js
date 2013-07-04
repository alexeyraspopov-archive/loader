(function(){
	'use strict';
	var aliases = {},
		cache = {};

	function path(uri){
		return uri.split(/\/+/).slice(0, -1).join('/') || '.';
	}

	function filename(uri){
		var name = uri.split(/\/+/).pop();

		return /\.js(on)*$/.test(name) ? name : name + '.js';
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
			if(aliases.hasOwnProperty(identifier)){
				identifier = aliases[identifier];
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

		// Load new module
		request = new XMLHttpRequest();

		// Processing module's code
		request.onreadystatechange = function(){
			if(this.readyState !== 4 || this.status && this.status !== 200){
				return;
			}

			if(/\.js$/.test(identifier)){
				exports = compile(identifier, base, this.response);
			}else{
				// Load JSON content
				exports = JSON.parse(this.response);
			}

			// If exports object is not exists
			if(!exports){
				throw new Error('Module ' + identifier + ' does not declare anything');
			}
		};

		request.open('GET', identifier, false);
		request.send();

		// Cache module's instance for next requests
		if(typeof exports !== 'object' || Object.keys(exports).length){
			cache[identifier] = exports;
		}

		// Prevent all manipulation with module instance
		Object.freeze(exports);

		return exports;
	}

	function config(options){
		var aliasList, index, name;

		aliasList = Object.keys(options.alias);

		// Add aliases to list
		for(index = 0; index < aliasList.length; index++){
			name = aliasList[index];
			aliases[name] = addExtension(options.alias[name]);
		}

		// Async call for initial points
		for(index = 0; index < options.start.length; index++){
			require(options.start[index], '.');
		}
	}

	window.loader = {
		config: config,
		cache: cache
	};
})();