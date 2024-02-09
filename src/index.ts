import { types } from 'vortex-api';

const GAME_ID = 'midnightclub2';
const STEAM_ID = '12160';

function main(context: types.IExtensionContext)
{
    context.registerGame({
        id: GAME_ID,
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
        //setup: prepareForModding
    });

    // context.registerAction('global-icons', 100, 'menu', {}, 'Sample', () =>
    // {
    //     context.api.showDialog('info', 'Success!',
    //     {
    //         text: 'Hello World',
    //     },
    //     [
    //         { label: 'Close' },
    //     ]);
    // });

    return true;
}

export default main;
