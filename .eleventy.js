module.exports = eleventyConfig => {
    eleventyConfig.addPassthroughCopy('./src/css')
    eleventyConfig.addWatchTarget("./src/css/");

    eleventyConfig.addPassthroughCopy('./src/images')
    eleventyConfig.addWatchTarget("./src/images/");
    
    eleventyConfig.addPassthroughCopy('./src/fonts')
    eleventyConfig.addWatchTarget("./src/fonts/");

    eleventyConfig.addPassthroughCopy('./src/scripts')
    eleventyConfig.addWatchTarget("./src/scripts/");


    eleventyConfig.addShortcode('excerpt', (post, length) => {
        let content = post.templateContent;
        let endFirstPara = content.indexOf('</p>');
        excerpt = content.slice(3, endFirstPara);
        return excerpt.slice(0, length) + "..."
    })

    eleventyConfig.addShortcode('formatDate', date => {
        return date.toLocaleDateString()
    })
	return {
        passthroughFileCopy: true,
		dir: {
			input: 'src',
			output: 'docs'
		}
	}
};
