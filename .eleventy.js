module.exports = eleventyConfig => {
    eleventyConfig.addPassthroughCopy('./blog/css')
    eleventyConfig.addWatchTarget("./blog/css/");

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
			input: 'blog'
		}
	}
};
