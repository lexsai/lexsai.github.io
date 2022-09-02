module.exports = eleventyConfig => {
    eleventyConfig.addPassthroughCopy('./src/css')
    eleventyConfig.addWatchTarget("./src/css/");

    eleventyConfig.addShortcode('excerpt', post => {
        let content = post.templateContent;
        let endFirstPara = content.indexOf('</p>');
        excerpt = content.slice(3, endFirstPara);
        return excerpt.slice(0, 200) + "..."
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
