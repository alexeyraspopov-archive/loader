module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			dist: ['<%= pkg.name %>.js']
		},
		uglify: {
			options: {
				report: 'min'
			},
			dist: {
				src: '<%= pkg.name %>.js',
				dest: '<%= pkg.name %>.min.js'
			}
		}
	});

	[
		'grunt-contrib-jshint',
		'grunt-contrib-uglify',
	].forEach(grunt.loadNpmTasks);

	grunt.registerTask('default', ['jshint', 'uglify']);
};