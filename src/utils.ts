const findCenterDifference = (valueToSearch: string, valueToCompareTo: string) : string =>
{
    // console.log(`findCenterDifference(valueToSearch: ${valueToSearch}, valueToCompareTo: ${valueToCompareTo})`);

    // find the first difference from the left
    // find the first difference from the right
    // return whatever is in between

    const minLength = Math.min(valueToSearch.length, valueToCompareTo.length);
    
    let leftDifferenceIndex = -1;

    for (let i = 0; i < minLength; i++)
    {
        if(valueToSearch[i] !== valueToCompareTo[i])
        {
            leftDifferenceIndex = i;
            break;
        }
    }

    // we reverse the values and search from the left again so the indices lign up
    const valueToSearchReversed    = reverse(valueToSearch);
    const valueToCompareToReversed = reverse(valueToCompareTo);

    let rightDifferenceIndexReversed = -1;

    for (let i = 0; i < minLength; i++)
    {
        if(valueToSearchReversed[i] !== valueToCompareToReversed[i])
        {
            rightDifferenceIndexReversed = i;
            break;
        }
    }

    const rightDifferenceIndex = valueToSearch.length - rightDifferenceIndexReversed - 1;
    const centerDifference     = valueToSearch.substring(leftDifferenceIndex, rightDifferenceIndex + 1);

    return centerDifference;
}

const reverse = (value: string) =>
{
    return [...value].reverse().join("");
}

const utils = 
{
    findCenterDifference,
    reverse
}

export default utils;