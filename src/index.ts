import { /*fs as vortexFs,*/ types, util } from "vortex-api";
import fs from "fs";
import path from "path";
import { IDiscoveryResult } from "vortex-api/lib/types/IState";
import { IExtensionApi, IInstallResult, IInstruction, ISupportedResult } from "vortex-api/lib/types/IExtensionContext";
import { IDialogResult } from "vortex-api/lib/actions";

const VORTEX_ID = 'midnightclub2';
const STEAMAPP_ID = '12160';
// cd/iso install -> C:\Games\Midnight Club II

const main = (context: types.IExtensionContext) =>
{
    context.registerGame(
    {
        id: VORTEX_ID,
        name: 'Midnight Club 2',
        mergeMods: true,
        supportedTools: [],
        queryModPath: () => '.',
        logo: 'gameart.jpg',
        executable: () => 'mc2.exe',
        requiredFiles: [
            'mc2.exe',
            'streams_pc.dat'
        ],
        details:
        {
            steamAppId: STEAMAPP_ID
        },
        setup: (discovery) => prepareForModding(discovery, context.api)
    });

    context.registerInstaller(`${VORTEX_ID}-installer`, 25, testSupportedContent, installContent);

    return true;
}

const prepareForModding = async (discovery: IDiscoveryResult, contextApi: IExtensionApi) =>
{
    contextApi.onStateChange(["persistent", "gameMode", "gameInfo", VORTEX_ID, "path", "value"], async (previousPath: string, currentPath: string) =>
    {
        if (currentPath === previousPath)
            return Promise.resolve();

        await validateInstallationDirectory(currentPath, contextApi);
    });

    return await validateInstallationDirectory(discovery.path, contextApi);
}

const validateInstallationDirectory = async (installationDirectory: string, contextApi: IExtensionApi) =>
{
    if (!fs.existsSync(path.join(installationDirectory, "assets_p.dat")))
        return Promise.resolve();

    const closedArchiveResult : IDialogResult = await contextApi.showDialog(
        "error",
        "Opened Archive Required",
        {
            text: "Your game instance seems to be working with a closed archive. This is the result of a default installation. To be able to mod your instance, you need to extract your assets_p.dat file. It is recommended to use the ar_extract tool to achieve this. For more details, watch the video tutorial linked below. For more help, visit the MC2 Community discord and ask around in our modding sub-community. Alternatively, we also provide a download link for an already opened instance.\n\nIf you have extracted your assets_p.dat file, but this error still shows up, then please delete your assets_p.dat file (or move it out of the root directory)."
        },
        [
            { label: "Watch Tutorial" },
            { label: "Join Discord" },
            { label: "Close", default: true }
        ]
    );
        
    if(closedArchiveResult.action == "Watch Tutorial")
        util.opn("https://www.youtube.com/watch?v=bJniSd6Wk10");

    if(closedArchiveResult.action == "Join Discord")
        util.opn("https://discord.gg/midnight-club-2");
        
    return Promise.reject(new util.SetupError("Opened Archive Required"));
}

const testSupportedContent = (files: string[], gameId: string, archivePath?: string) : Promise<ISupportedResult> =>
{
    console.info("testSupportedContent");
    console.debug(files);
    console.debug(archivePath);

    const modIsSupported = 
        gameId === VORTEX_ID; // &&
        //files.find(file => file.toLowerCase() === "content\\") !== undefined;

    return Promise.resolve({
        supported: modIsSupported,
        requiredFiles: []
    });
}

// Todo:
// Figure out how to support renaming files, like vp_lancer_side-b.tex -> vp_lancer_side-b.bmp
// Tip: work with a json instruction list to rename files, add attributes to the mod on enable, query for attributes during disable and restore those files
const installContent = (folderAndFilePaths: string[]): Promise<IInstallResult> =>
{
    const contentFolderName = "content\\"; // add _ later

    const modHasContentFolderInRoot = folderAndFilePaths.map(p => p.toLowerCase()).includes(contentFolderName);

    // first, filter out all the folder paths, keep only file paths
    let filteredFilePaths = folderAndFilePaths.filter(filePath => !filePath.endsWith(path.sep));

    // second, if root folder contains a folder named "content", take only those files
    if(modHasContentFolderInRoot)
        filteredFilePaths = filteredFilePaths.filter(filePath => filePath.toLowerCase().startsWith(contentFolderName));

    const replacePattern = new RegExp(contentFolderName.replaceAll("\\", "\\\\"), "i");

    const instructions = filteredFilePaths.map(filePathToCopy =>
    {
        return {
            type: "copy",
            source: filePathToCopy,
            destination: path.join(filePathToCopy.replace(replacePattern, "")),
        } as IInstruction;
    });

    return Promise.resolve({
        instructions
    });
}

export default main;
