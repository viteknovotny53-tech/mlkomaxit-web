import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/img/*.{jpg,png,svg}");
  // snímky videa s postupem v úvodu, už zmenšené
  eleventyConfig.addPassthroughCopy("src/img/proces");

  // Fotky z CMS (i velké z mobilu) se při buildu zmenší a převedou do WebP
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [480, 960, 1600],
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async" },
    },
  });

  // Česká typografie: nezlomitelná mezera za jednopísmennými předložkami a spojkami
  eleventyConfig.addFilter("cz", (text = "") => {
    const glue = (s) => s.replace(/(^|[\s(„])([aikosuvzAIKOSUVZ])\s+/g, "$1$2 ");
    return glue(glue(String(text)));
  });

  eleventyConfig.addFilter("tel", (phone = "") => String(phone).replace(/[^\d+]/g, ""));
  eleventyConfig.addFilter("phoneShort", (phone = "") => String(phone).replace(/^\+420\s*/, ""));
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));
  // datum sestavení pro sitemap (lastmod)
  eleventyConfig.addShortcode("today", () => new Date().toISOString().slice(0, 10));

  // „517 25 Čermná nad Orlicí“ → PSČ a obec zvlášť pro strukturovaná data
  eleventyConfig.addFilter("psc", (city = "") => (String(city).match(/^\s*(\d{3}\s?\d{2})/) || [, ""])[1]);
  eleventyConfig.addFilter("obec", (city = "") => String(city).replace(/^\s*\d{3}\s?\d{2}\s*/, ""));

  return {
    dir: { input: "src", output: "_site" },
    templateFormats: ["njk"],
  };
}
