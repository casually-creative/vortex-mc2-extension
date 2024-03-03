import fs from "fs";
import path from "path";

import { selectors, util } from "vortex-api";
import { IDialogResult } from "vortex-api/lib/actions";
import { IExtensionApi, IExtensionContext, IInstallResult, IInstruction, ISupportedResult } from "vortex-api/lib/types/IExtensionContext";
import { IDiscoveryResult, IMod } from "vortex-api/lib/types/IState";

import modInstructions, { IFileInstructions } from "./modInstructions";

const VORTEX_ID = 'midnightclub2';
const STEAMAPP_ID = '12160';
const RENAME_INSTRUCTIONS_KEY = "file_rename_instructions";
// cd/iso install -> C:\Games\Midnight Club II

const main = (context: IExtensionContext) =>
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

    context.once(() =>
    {      
        context.api.onStateChange(["persistent", "gameMode", "gameInfo", VORTEX_ID, "path", "value"], (previousPath, currentPath) =>
        {
            console.log("onStateChangeCallbackCalled");

            // This hooks into the game location path getting changed, so we can revalidate the new installation directory.
            if (currentPath === previousPath)
                return; // Promise.resolve();

            validateInstallationDirectorySync(currentPath, context.api);
        });

        // sadly this event is internal, not intended to be used by 3rd party devs
        // context.api.onAsync("manually-set-game-location", async (profileId: string, deployment: IDeploymentManifest) => await handleManuallySetGameLocation(context.api, profileId, deployment));

        context.api.events.on("mods-enabled", (modIds: string[], enabled: boolean, gameId: string) => handleModsEnabled(context.api, modIds, enabled, gameId));
    });

    return true;
}



const prepareForModding = async (discovery: IDiscoveryResult, vortexApi: IExtensionApi): Promise<void> =>
{
    console.log("prepareForModdingCalled");

    return await validateInstallationDirectory(discovery.path, vortexApi);
}

const validateInstallationDirectory = async (installationDirectory: string, vortexApi: IExtensionApi) =>
{
    // We detect whether or not the user has extracted their archive, by the existence of the assets_p.dat file.
    // Users need to delete this file after extraction to pass this check.

    if (!fs.existsSync(path.join(installationDirectory, "assets_p.dat")))
        return Promise.resolve();

    const closedArchiveResult : IDialogResult = vortexApi.showDialog(
        "error",
        "Opened Archive Required",
        {
            text: "Enabled mods will not have any effect because your game instance seems to be working with a closed archive.This is the result of a default installation.\n\nTo be able to mod your instance, you need to extract your assets_p.dat file. It is recommended to use the ar_extract tool to achieve this. For more details, watch the video tutorial linked below. For more help, visit the MC2 Community discord and ask around in our modding sub-community. Alternatively, we also provide a download link for an already opened instance.\n\nIf you have extracted your assets_p.dat file, but this error still shows up, then please delete your assets_p.dat file (or move it out of the root directory)."
        },
        [
            { label: "Watch Tutorial" },
            { label: "Join Discord" },
            { label: "Close", default: true }
        ]
    );
        
    if(closedArchiveResult.action == "Watch Tutorial")
        util.opn("https://youtu.be/QjQBnekFxpo");

    if(closedArchiveResult.action == "Join Discord")
        util.opn("https://discord.gg/midnight-club-2");
        
    // maybe the extra error notification is overkill?
    return Promise.reject(new util.SetupError("Opened Archive Required"));
}

const validateInstallationDirectorySync = (installationDirectory: string, vortexApi: IExtensionApi) =>
{
    // We detect whether or not the user has extracted their archive, by the existence of the assets_p.dat file.
    // Users need to delete this file after extraction to pass this check.

    if (!fs.existsSync(path.join(installationDirectory, "assets_p.dat")))
        return;

    const closedArchiveResult : IDialogResult = vortexApi.showDialog(
        "error",
        "Opened Archive Required",
        {
            text: "Enabled mods will not have any effect because your game instance seems to be working with a closed archive. This is the result of a default installation.\n\nTo be able to mod your instance, you need to extract your assets_p.dat file. It is recommended to use the ar_extract tool to achieve this. For more details, watch the video tutorial linked below. For more help, visit the MC2 Community discord and ask around in our modding sub-community. Alternatively, we also provide a download link for an already opened instance.\n\nIf you have extracted your assets_p.dat file, but this error still shows up, then please delete your assets_p.dat file (or move it out of the root directory)."
        },
        [
            { label: "Watch Tutorial" },
            { label: "Join Discord" },
            { label: "Close", default: true }
        ]
    );
        
    if(closedArchiveResult.action == "Watch Tutorial")
        util.opn("https://youtu.be/QjQBnekFxpo");

    if(closedArchiveResult.action == "Join Discord")
        util.opn("https://discord.gg/midnight-club-2");
}

const testSupportedContent = (files: string[], gameId: string) : Promise<ISupportedResult> =>
{
    const modIsSupported = gameId === VORTEX_ID;

    return Promise.resolve({
        supported: modIsSupported,
        requiredFiles: []
    });
}

const installContent = (folderAndFilePaths: string[], destinationPath: string): Promise<IInstallResult> =>
{
    console.log("InstallContentCalled");

    const modFilesFolderName = "_modfiles\\";
    const modHasModFilesFolderInRoot = folderAndFilePaths.map(p => p.toLowerCase()).includes(modFilesFolderName);

    // first, filter out all the folder paths, keep only file paths
    let filteredFilePaths = folderAndFilePaths.filter(filePath => !filePath.endsWith(path.sep));

    // second, if root folder contains a folder named "_modFiles", take only those files
    if(modHasModFilesFolderInRoot)
        filteredFilePaths = filteredFilePaths.filter(filePath => filePath.toLowerCase().startsWith(modFilesFolderName));

    const replacePattern = new RegExp(modFilesFolderName.replaceAll("\\", "\\\\"), "i");

    const instructions = filteredFilePaths.map(filePathToCopy =>
    {
        return {
            type: "copy",
            source: filePathToCopy,
            destination: path.join(filePathToCopy.replace(replacePattern, "")),
        } as IInstruction;
    });

    const renameInstruction = getRenameInstruction(destinationPath);

    if(renameInstruction)
        instructions.push(renameInstruction);

    return Promise.resolve({
        instructions
    });
}

const getRenameInstruction = (destinationPath: string): IInstruction | undefined =>
{
    const instructionsPath = path.join(destinationPath, "_vortex/instructions.json");
    const instructionsExist = fs.existsSync(instructionsPath);

    if(!instructionsExist)
        return;

    console.log(`instructionsExist: ${instructionsExist}`);

    // todo: try catch JSON.parse() as IFileInstructions
    const instructions = fs.readFileSync(instructionsPath, { encoding: "utf8" });

    return {
        key: RENAME_INSTRUCTIONS_KEY,
        value: instructions,
        type: "attribute"
    };
}

const handleModsEnabled = (vortexApi: IExtensionApi, modIds: string[], enabled: boolean, gameId: string) =>
{
    console.log("ExecutingHandleModsEnabled");
    console.log(`mod ids: ${JSON.stringify(modIds)}`);
    console.log(`enabled: ${enabled}`);
    console.log(`gameId:  ${gameId}`);

    if (gameId !== VORTEX_ID)
        return;

    try
    {
        validateInstallationDirectorySync(getDiscoveryPath(vortexApi), vortexApi);

        modIds.forEach((modId: string) => executeModInstallationInstructions(vortexApi, modId, enabled));
    }
    catch(error)
    {
        console.error(`CaughtHandleModEnabledError': ${error}`)
    }
}


const executeModInstallationInstructions = (vortexApi: IExtensionApi, modId: string, enabled: boolean) =>
{
    console.log(`ExecutingExecuteModInstallationInstructions for mod with id '${modId}' being ${enabled ? "enabled" : "disabled"}.`);

    const applicationState = vortexApi.getState();
    const instructionsAttribute = util.getSafe<string>(applicationState, ["persistent", "mods", VORTEX_ID, modId, "attributes", RENAME_INSTRUCTIONS_KEY], null);

    if(!instructionsAttribute)
    {
        // console.log(`No file rename instructions found for mod with id '${modId}'.`);
        return;
    }

    const instructions = JSON.parse(instructionsAttribute) as IFileInstructions;

    if(!instructions)
        return;

    modInstructions.executeFileRenames(instructions.rename, getDiscoveryPath(vortexApi), enabled);
}

const getDiscoveryPath = (vortexApi: IExtensionApi): string | undefined =>
{
    const state = vortexApi.getState();
    const profile = selectors.activeProfile(state);

    if (profile?.gameId !== VORTEX_ID)
        return;

    const discovery: IDiscoveryResult = selectors.discoveryByGame(state, VORTEX_ID);

    if (!discovery?.path)
        return;

    return discovery.path;
}

export default main;