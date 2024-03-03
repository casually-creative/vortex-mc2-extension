import fs from "fs";
import { join } from "path";
import fg from "fast-glob";

import utils from "./utils";

export type IFileInstructions =
{
    rename: IFileRenameInstruction[];
}

export type IFileRenameInstruction =
{
    from: string;
    to: string;
}

const executeFileRenames = (renameInstructions: IFileRenameInstruction[], directoryPath: string, enabled: boolean) =>
{
    // EXAMPLE:

    // directoryPath:    "C:/Games/Midnight Club 2/_modFiles"

    // instruction.from: "/texture_x/vp_lancer_*.tex"
    // instruction.to:   "/texture_x/vp_lancer_*.bmp"

    // absoluteFromFile: "C:/Games/Midnight Club 2/_modFiles/texture_x/vp_lancer_side-a.tex"
    // relativeFromFile: "/texture_x/vp_lancer_side-a.tex"
    // wildcardValue:    "side-a"
    // relativeToFile:   "/texture_x/vp_lancer_side-a.bmp"
    // absoluteToFile:   "C:/Games/Midnight Club 2/_modFiles/texture_x/vp_lancer_side-a.bmp"

    console.log(`executeFileRenames called with enabled: ${enabled}`);
    console.log(`renameInstructions`);
    console.log(JSON.stringify(renameInstructions))

    for (const renameInstruction of renameInstructions)
    {
        enabled
            ? executeFileRename(renameInstruction.from, renameInstruction.to,   directoryPath)
            : executeFileRename(renameInstruction.to,   renameInstruction.from, directoryPath);
    }
}

const executeFileRename = (from: string, to: string, directoryPath: string) =>
{
    directoryPath = directoryPath.replace(/\\/g,"/");

    const searchDirectory = join(directoryPath, from).replace(/\\/g,"/");

    console.log(`searchDirectory: ${searchDirectory}`);

    const fromFiles = fg.sync([searchDirectory], { dot: true });

    console.log(`fromFiles: ${JSON.stringify(fromFiles)}`);

    fromFiles.forEach(absoluteFromFile =>
    {
        const relativeFromFile = absoluteFromFile.replace(directoryPath, "");
        let relativeToFile = to;

        if(to.includes("*"))
        {
            const wildcardValue = utils.findCenterDifference(relativeFromFile, from);
            relativeToFile = to.replace("*", wildcardValue);
        }

        const absoluteToFile = join(directoryPath, relativeToFile).replace(/\\/g,"/");

        console.log(`absoluteFromFile: ${absoluteFromFile}`);
        // console.log(`relativeFromFile: ${relativeFromFile}`);
        // console.log(`wildcardValue:    ${wildcardValue}`);
        // console.log(`relativeToFile:   ${relativeToFile}`);
        console.log(`absoluteToFile:   ${absoluteToFile}`);

        fs.rename(absoluteFromFile, absoluteToFile, error =>
        {
            if (error)
                console.error(`Error renaming ${absoluteFromFile} to ${absoluteToFile}:`, error);
        });
    });
}

const modInstructions = 
{
    executeFileRenames
}

export default modInstructions;