package com.skinmatch.api.analyzer;

import java.util.List;

/** Python の判定サービスへの窓口。テストではこのインターフェースを差し替える。 */
public interface AnalyzerClient {

    /** 全成分表示の文字を、統一した成分名の一覧にする。 */
    List<String> normalize(String text);

    /** 候補の成分を、自分の記録に照らして分ける。 */
    Judgement judge(List<String> candidate, List<UsageResult> records);

    /** 記録全体から、合った物の共通点と注意点を出す。 */
    Judgement insights(List<UsageResult> records);

    /** 判定に渡す記録（合った／合わなかった と、その化粧品の成分）。 */
    record UsageResult(String result, List<String> ingredients) {}

    record Finding(String ingredient, int goodCount, int badCount, String reason) {}

    record Judgement(
            int goodTotal,
            int badTotal,
            boolean lowData,
            List<Finding> common,
            List<Finding> caution,
            List<Finding> mixed,
            List<Finding> unknown) {}
}
