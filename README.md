<p align="center">  
    <img height="257" width="458" src="./artwork/gulp-multi-thread-task-2x.png">  
</p>
  
## Installation  
  
```npm install gulp-multi-thread-task --save-dev```  
  
## What is gulp-multi-thread-task?  
  
**gulp-multi-thread-task** is a **simple** and easy way to transform a gulp task into a task which is runs on **multiple threads**  
  
Benefits  
- **Blazing Fast** - non blocking file processing, threads will always be provided files until all files have been processed.  
- **Optimized** - seamlessly add multi-core support to a gulp task, will only spawn a thread once and reuse the same thread unlike [gulp-multi-process](https://www.npmjs.com/package/gulp-multi-process#warning) which spawns a new thread per task.  
- **Simple** - Easy to transform a existing task into a multi-threaded task.  
  
## Why?!  
  
node is a single thread, and almost all machines have multiple cores, this plugin allows your gulp task run time to be drastically improved by magnitudes by the number of threads used.

## Example

```
const gulp = require('gulp')
const imagemin = require('gulp-imagemin');
const texturePacker = require('gulp-free-tex-packer');
const {GulpMultiThreadTask} = require('gulp-multi-thread-task');

function buildSprites(done, src) {
	return gulp.src(src)
		.pipe(texturePacker()
		.pipe(imagemin())
		.pipe(gulp.dest());
}

function gulpBuildSprites(done, gameName = userOptionGameName) {
	return GulpMultiThreadTask(['assets/**/*.*(svg|png|jpg|jpeg)'], buildSprites);  
}

// example multiple glob array to batch file process
// you can batch a group of files together to create a single stream process
function gulpBuildSpritesGames {
	return GulpMultiThreadTask([
			['assets/**/game1/**/*.*(svg|png|jpg|jpeg)'],
			['assets/**/game1/**/*.*(svg|png|jpg|jpeg)']
		], buildSprites
	);  
}

exports.buildSprites = gulpBuildSprites;
exports.buildSpritesGames = gulpBuildSpriteGames
```

## API

```GulpMultiThreadTask(globArray, gulpFunction, options);```

### globArray
Type: `Array`

The glob pattern of file that will be processed by gulpFunction

### gulpFunction
Type: `Function`

gulp style function which will run on multiple threads, required parameters gulpFunction(done, src)

### Options

#### concurrency
Type: `number`
Default: `os.cpus().length`

The number of threads to use.

#### silent
Type: `boolean`
Default: `false`

Whether or not to send output to parent's stdio
