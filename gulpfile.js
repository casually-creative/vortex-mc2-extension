/* eslint-disable @typescript-eslint/no-var-requires */
const gulp = require("gulp");
const fs = require('fs').promises;
const path = require('path');
const VORTEX_PLUGINS = path.join(process.env.APPDATA, 'Vortex', 'Plugins');

const copyAssets = function ()
{
    return gulp
        .src(`./assets/**/*.*`)
        .pipe(gulp.dest("./dist"));
};

const removeOldPlugins = async (name) =>
{
    const entries = await (await fs.readdir(VORTEX_PLUGINS)).filter(entry => entry.startsWith(name));

    for (const entry of entries)
    {
        const contents = await fs.readdir(path.join(VORTEX_PLUGINS, entry));

        for (const content of contents)
        {
            await fs.unlink(path.join(VORTEX_PLUGINS, entry, content));
        }

        await fs.rmdir(path.join(VORTEX_PLUGINS, entry));
    }
}

// Decided not to use the vortex-api's version as it auto-generates a name based on the package name, which is not ideal.
const extractInfo = async () =>
{
    try
    {
        const packageDataFromFile = await fs.readFile(path.join(__dirname, 'package.json'), { encoding: 'utf8' });
        const packageData = JSON.parse(packageDataFromFile);

        const infoData = 
        {
            name: `Game: ${packageData["vortex-game"]}`,
            author: packageData.author,
            version: packageData.version,
            description: packageData.description,
            lastUpdated: Date.now()
        }

        const infoFile = await fs.writeFile(path.join(__dirname, "dist", "info.json"), JSON.stringify(infoData));
        await infoFile?.close();
    }
    catch (err)
    {
        console.error(err);
    }
}

const deployPlugin = async () =>
{
    try
    {
        const packageData = await fs.readFile(path.join(__dirname, 'package.json'), { encoding: 'utf8' });
        const data = JSON.parse(packageData);
        const destination = path.join(VORTEX_PLUGINS, `${data["vortex-plugin"]} - ${data["vortex-game"]} v${data.version}`);

        try
        {
            await removeOldPlugins(data.name);
        }
        catch (err)
        {
            console.error(err);
        }

        const fileEntries = await fs.readdir(path.join(__dirname, 'dist'));
        await fs.mkdir(destination, { recursive: true });

        for (const file of fileEntries)
        {
            await fs.copyFile(path.join(__dirname, 'dist', file), path.join(destination, file));
        }
    }
    catch (err)
    {
        console.error(err);
    }
}

exports.build = gulp.series(copyAssets, extractInfo);
exports.default = deployPlugin;