import * as BluebirdPromise from "bluebird";

export function raceToResolution<TResult>(promises: Array<BluebirdPromise<TResult>>, onErrorCallback?: (err) => void): BluebirdPromise<TResult> {
    
  // There is no way to know which promise is rejected.
  // So we map it to a new promise to return the index when it fails
  const indexPromises = promises.map((p, index) => 
    p.catch(() => {
      throw index;
    }));
    
  return BluebirdPromise.race(indexPromises).catch(index => {
    // The promise has rejected, remove it from the list of promises and just continue the race.
    const p = promises.splice(index, 1)[0];
    // tslint:disable-next-line:no-empty
      p.catch(e => {
          if (onErrorCallback) {
              onErrorCallback(e);
          }
      }); // eat errors, we're only interested in successful ones
    return raceToResolution(promises);
  });
};